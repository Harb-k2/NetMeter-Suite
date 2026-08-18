"""NetMeter Suite: local per-network monitor for Windows and Kali Linux."""
from __future__ import annotations

import csv
import datetime as dt
import platform
import sqlite3
import subprocess
import threading
import time
import urllib.request
from pathlib import Path
from queue import Empty, Queue

import psutil
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk

APP_DIR = Path.home() / ".netmeter-suite"
DB_PATH = APP_DIR / "netmeter.sqlite3"
POLL_INTERVAL_MS = 5_000
SSID_CACHE_SECONDS = 12
COMMIT_INTERVAL_SECONDS = 12


def format_bytes(value: int | float) -> str:
    units, current, index = ("بايت", "ك.ب", "م.ب", "غ.ب", "ت.ب"), max(0.0, float(value)), 0
    while current >= 1024 and index < len(units) - 1:
        current, index = current / 1024, index + 1
    return f"{current:.0f} {units[index]}" if current >= 100 or index == 0 else f"{current:.1f} {units[index]}"


def safe_delta(previous: tuple[int, int] | None, current: tuple[int, int]) -> tuple[int, int] | None:
    if previous is None or current[0] < previous[0] or current[1] < previous[1]:
        return None
    return current[0] - previous[0], current[1] - previous[1]


def usage_alert_level(total: int, limit: int | None, warning_percentage: int = 80) -> str | None:
    if not limit or limit <= 0:
        return None
    if total >= limit:
        return "exceeded"
    if total >= limit * max(50, min(99, warning_percentage)) / 100:
        return "warning"
    return None


def run(command: list[str]) -> str:
    try:
        return subprocess.check_output(command, stderr=subprocess.DEVNULL, text=True, timeout=4, encoding="utf-8", errors="ignore")
    except (OSError, subprocess.SubprocessError):
        return ""


def ssid() -> str | None:
    if platform.system() == "Windows":
        for line in run(["netsh", "wlan", "show", "interfaces"]).splitlines():
            if "SSID" in line and "BSSID" not in line and ":" in line:
                value = line.split(":", 1)[1].strip()
                if value:
                    return value
        return None
    for line in run(["nmcli", "-t", "-f", "ACTIVE,SSID", "dev", "wifi"]).splitlines():
        if line.startswith("yes:") and line[4:].strip():
            return line[4:].strip()
    return run(["iwgetid", "-r"]).strip() or None


def active_interface() -> str | None:
    stats, counters = psutil.net_if_stats(), psutil.net_io_counters(pernic=True)
    choices = [name for name, stat in stats.items() if stat.isup and not name.lower().startswith(("lo", "loopback")) and name in counters]
    return max(choices, key=lambda name: counters[name].bytes_recv + counters[name].bytes_sent) if choices else None


class Store:
    """SQLite store optimized for frequent, local monitoring writes."""

    def __init__(self) -> None:
        APP_DIR.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=NORMAL")
        self.db.execute("PRAGMA busy_timeout=3000")
        self.db.execute("CREATE TABLE IF NOT EXISTS daily_usage(network_key TEXT NOT NULL,label TEXT NOT NULL,date TEXT NOT NULL,received INTEGER NOT NULL DEFAULT 0,transmitted INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(network_key,date))")
        self.db.execute("CREATE TABLE IF NOT EXISTS speed_results(id INTEGER PRIMARY KEY,network_key TEXT NOT NULL,measured_at TEXT NOT NULL,download REAL,upload REAL,latency REAL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS network_limits(network_key TEXT PRIMARY KEY,limit_bytes INTEGER NOT NULL,warning_percentage INTEGER NOT NULL DEFAULT 80)")
        self.db.execute("CREATE TABLE IF NOT EXISTS usage_alerts(network_key TEXT NOT NULL,date TEXT NOT NULL,level TEXT NOT NULL,PRIMARY KEY(network_key,date))")
        if "warning_percentage" not in {row[1] for row in self.db.execute("PRAGMA table_info(network_limits)")}:
            self.db.execute("ALTER TABLE network_limits ADD COLUMN warning_percentage INTEGER NOT NULL DEFAULT 80")
        self.db.commit()
        self._pending_writes = 0
        self._last_commit = time.monotonic()

    def flush(self, force: bool = False) -> None:
        if self._pending_writes and (force or time.monotonic() - self._last_commit >= COMMIT_INTERVAL_SECONDS):
            self.db.commit()
            self._pending_writes = 0
            self._last_commit = time.monotonic()

    def record(self, key: str, label: str, received: int, transmitted: int) -> None:
        if received <= 0 and transmitted <= 0:
            return
        self.db.execute("INSERT INTO daily_usage(network_key,label,date,received,transmitted) VALUES(?,?,?,?,?) ON CONFLICT(network_key,date) DO UPDATE SET label=excluded.label,received=received+excluded.received,transmitted=transmitted+excluded.transmitted", (key, label, dt.date.today().isoformat(), received, transmitted))
        self._pending_writes += 1
        self.flush()

    def today(self, key: str) -> tuple[int, int]:
        row = self.db.execute("SELECT received,transmitted FROM daily_usage WHERE network_key=? AND date=?", (key, dt.date.today().isoformat())).fetchone()
        return row if row else (0, 0)

    def month_for(self, key: str) -> int:
        row = self.db.execute("SELECT COALESCE(SUM(received+transmitted), 0) FROM daily_usage WHERE network_key=? AND date LIKE ?", (key, f"{dt.date.today():%Y-%m}%")).fetchone()
        return int(row[0] or 0)

    def rows(self) -> list[tuple[str, int, int, int]]:
        today, month = dt.date.today().isoformat(), f"{dt.date.today():%Y-%m}%"
        return self.db.execute("SELECT MAX(label),SUM(CASE WHEN date=? THEN received+transmitted ELSE 0 END),SUM(CASE WHEN date LIKE ? THEN received+transmitted ELSE 0 END),SUM(received+transmitted) FROM daily_usage GROUP BY network_key ORDER BY MAX(date) DESC", (today, month)).fetchall()

    def speed(self, key: str, download: float, upload: float, latency: float) -> None:
        self.db.execute("INSERT INTO speed_results(network_key,measured_at,download,upload,latency) VALUES(?,?,?,?,?)", (key, dt.datetime.now().isoformat(timespec="seconds"), download, upload, latency))
        self._pending_writes += 1
        self.flush(force=True)

    def limit_config(self, key: str) -> tuple[int | None, int]:
        row = self.db.execute("SELECT limit_bytes,warning_percentage FROM network_limits WHERE network_key=?", (key,)).fetchone()
        return (row[0], row[1]) if row else (None, 80)

    def set_limit(self, key: str, limit: int | None, warning_percentage: int = 80) -> None:
        if limit is None:
            self.db.execute("DELETE FROM network_limits WHERE network_key=?", (key,))
        else:
            self.db.execute("INSERT INTO network_limits(network_key,limit_bytes,warning_percentage) VALUES(?,?,?) ON CONFLICT(network_key) DO UPDATE SET limit_bytes=excluded.limit_bytes,warning_percentage=excluded.warning_percentage", (key, limit, max(50, min(99, warning_percentage))))
        self._pending_writes += 1
        self.flush(force=True)

    def claim_alert(self, key: str, total: int) -> tuple[str, int, int] | None:
        limit, warning = self.limit_config(key)
        level = usage_alert_level(total, limit, warning)
        if not level or not limit:
            return None
        date = dt.date.today().isoformat()
        previous = self.db.execute("SELECT level FROM usage_alerts WHERE network_key=? AND date=?", (key, date)).fetchone()
        if previous and (previous[0] == level or previous[0] == "exceeded"):
            return None
        self.db.execute("INSERT INTO usage_alerts(network_key,date,level) VALUES(?,?,?) ON CONFLICT(network_key,date) DO UPDATE SET level=excluded.level", (key, date, level))
        self._pending_writes += 1
        self.flush(force=True)
        return level, limit, warning

    def export_csv(self, target: str) -> int:
        self.flush(force=True)
        rows = self.db.execute("SELECT label,network_key,date,received,transmitted,received+transmitted FROM daily_usage ORDER BY date DESC,label").fetchall()
        with open(target, "w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["الشبكة", "المعرف", "التاريخ", "التنزيل بالبايت", "الرفع بالبايت", "الإجمالي بالبايت"])
            writer.writerows(rows)
        return len(rows)

    def close(self) -> None:
        self.flush(force=True)
        self.db.close()


class Monitor:
    """Reads one active interface and caches the expensive SSID lookup briefly."""

    def __init__(self, store: Store) -> None:
        self.store, self.last_key, self.last_counter = store, None, None
        self._ssid_value: str | None = None
        self._ssid_interface: str | None = None
        self._ssid_checked_at = 0.0

    def tick(self) -> tuple[str, str] | None:
        interface = active_interface()
        if not interface:
            self.last_key, self.last_counter, self._ssid_interface = None, None, None
            return None
        now = time.monotonic()
        if interface != self._ssid_interface or now - self._ssid_checked_at >= SSID_CACHE_SECONDS:
            self._ssid_value, self._ssid_interface, self._ssid_checked_at = ssid(), interface, now
        name = self._ssid_value
        key, label = (f"wifi:{name}", name) if name else (f"interface:{interface}", f"واجهة {interface}")
        counter = psutil.net_io_counters(pernic=True)[interface]
        current = (counter.bytes_recv, counter.bytes_sent)
        if key == self.last_key:
            delta = safe_delta(self.last_counter, current)
            if delta:
                self.store.record(key, label, *delta)
        self.last_key, self.last_counter = key, current
        return key, label


def speed_test(key: str, store: Store) -> tuple[float, float, float]:
    started = time.perf_counter()
    with urllib.request.urlopen(f"https://speed.cloudflare.com/__down?bytes=0&t={time.time()}", timeout=20) as response:
        response.read(1)
    latency = (time.perf_counter() - started) * 1000
    size, started = 2_000_000, time.perf_counter()
    with urllib.request.urlopen(f"https://speed.cloudflare.com/__down?bytes={size}&t={time.time()}", timeout=45) as response:
        downloaded = len(response.read())
    download = downloaded * 8 / ((time.perf_counter() - started) * 1_000_000)
    payload, started = b"0" * 500_000, time.perf_counter()
    request = urllib.request.Request(f"https://speed.cloudflare.com/__up?t={time.time()}", data=payload, method="POST")
    with urllib.request.urlopen(request, timeout=45) as response:
        response.read(1)
    upload = len(payload) * 8 / ((time.perf_counter() - started) * 1_000_000)
    store.speed(key, download, upload, latency)
    return download, upload, latency


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("NetMeter Suite")
        self.geometry("880x690")
        self.minsize(700, 580)
        self.configure(bg="#F3F6FA")
        self.store = Store()
        self.monitor = Monitor(self.store)
        self.events: Queue[tuple[str, object]] = Queue()
        self.network = tk.StringVar(value="جارِ التحقق من الشبكة…")
        self.usage = tk.StringVar(value="—")
        self.month = tk.StringVar(value="—")
        self.speed = tk.StringVar(value="لم يُجر اختبار بعد")
        self.status = tk.StringVar(value="تتم المراقبة محليًا، وتُحدّث القراءة كل خمس ثوانٍ.")
        self.limit_status = tk.StringVar(value="لم يُضبط حد لهذه الشبكة بعد")
        self.live_state = tk.StringVar(value="● بدء المراقبة المحلية")
        self.testing = False
        self._last_table_update = 0.0
        self.build()
        self.protocol("WM_DELETE_WINDOW", self.close)
        self.bind_all("<F5>", lambda _event: self.refresh_report())
        self.bind_all("<Control-e>", lambda _event: self.export_csv())
        self.bind_all("<Control-l>", lambda _event: self.configure_limit())
        self.after(150, self.poll)

    def build(self) -> None:
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("Treeview", rowheight=33, font=("Arial", 10), background="#FFFFFF", fieldbackground="#FFFFFF", foreground="#0F2438", borderwidth=0)
        style.configure("Treeview.Heading", font=("Arial", 10, "bold"), background="#E8EEF5", foreground="#38516A", relief="flat")
        style.map("Treeview", background=[("selected", "#DCEFF2")], foreground=[("selected", "#0B4250")])
        style.configure("Primary.TButton", font=("Arial", 10, "bold"), padding=(14, 10), background="#0F766E", foreground="#FFFFFF", borderwidth=0)
        style.map("Primary.TButton", background=[("active", "#0B615A"), ("disabled", "#9ABCB8")])
        style.configure("Secondary.TButton", font=("Arial", 10, "bold"), padding=(12, 9), background="#E7EEF6", foreground="#12496A", borderwidth=0)
        style.map("Secondary.TButton", background=[("active", "#D6E3EF")])
        style.configure("Safe.Horizontal.TProgressbar", troughcolor="#E8EEF5", background="#16826F", bordercolor="#E8EEF5", lightcolor="#16826F", darkcolor="#16826F")
        style.configure("Warning.Horizontal.TProgressbar", troughcolor="#E8EEF5", background="#D98B13", bordercolor="#E8EEF5", lightcolor="#D98B13", darkcolor="#D98B13")
        style.configure("Critical.Horizontal.TProgressbar", troughcolor="#E8EEF5", background="#C43D4D", bordercolor="#E8EEF5", lightcolor="#C43D4D", darkcolor="#C43D4D")

        header = tk.Frame(self, bg="#0B1F33", height=112)
        header.pack(fill="x")
        tk.Label(header, text="NetMeter Suite", fg="#FFFFFF", bg="#0B1F33", font=("Arial", 25, "bold")).pack(anchor="e", padx=30, pady=(23, 1))
        tk.Label(header, text="مراقبة الاستهلاك وسرعة الإنترنت بحسب الشبكة — بياناتك تبقى على جهازك", fg="#B9C9D9", bg="#0B1F33", font=("Arial", 10)).pack(anchor="e", padx=30)
        tk.Label(header, textvariable=self.live_state, fg="#8EE5D0", bg="#0B1F33", font=("Arial", 9, "bold")).pack(anchor="e", padx=30, pady=(4, 0))

        body = tk.Frame(self, bg="#F3F6FA")
        body.pack(fill="both", expand=True, padx=24, pady=18)
        body.grid_columnconfigure((0, 1), weight=1, uniform="metric")

        self._metric_card(body, "الشبكة المتصلة الآن", self.network, "تفصل السجلات تلقائيًا لكل شبكة", 0, 0)
        self._metric_card(body, "استهلاك اليوم لهذه الشبكة", self.usage, "تنزيل ورفع اليوم الحالي", 0, 1)
        self._metric_card(body, "استهلاك هذا الشهر", self.month, "إجمالي الشهر للشبكة الحالية", 1, 0)
        self._metric_card(body, "آخر قياس للسرعة", self.speed, "اختبار يدوي يستهلك بيانات فعلية", 1, 1)

        limit_box = tk.Frame(body, bg="#FFFFFF", highlightbackground="#DCE5EF", highlightthickness=1)
        limit_box.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(14, 9))
        tk.Label(limit_box, text="حالة حد البيانات", bg="#FFFFFF", fg="#5D6B7B", font=("Arial", 10, "bold")).pack(anchor="e", padx=15, pady=(12, 2))
        self.progress = ttk.Progressbar(limit_box, mode="determinate", maximum=100, style="Safe.Horizontal.TProgressbar")
        self.progress.pack(fill="x", padx=15, pady=(2, 5))
        tk.Label(limit_box, textvariable=self.limit_status, bg="#FFFFFF", fg="#52677B", font=("Arial", 10), anchor="e", justify="right").pack(fill="x", padx=15, pady=(0, 12))

        actions = tk.Frame(body, bg="#F3F6FA")
        actions.grid(row=3, column=0, columnspan=2, sticky="ew", pady=(2, 12))
        self.test_button = ttk.Button(actions, text="قياس السرعة الآن", style="Primary.TButton", command=self.run_test)
        self.test_button.pack(side="right")
        ttk.Button(actions, text="تعيين حد الشبكة", style="Secondary.TButton", command=self.configure_limit).pack(side="right", padx=8)
        ttk.Button(actions, text="تصدير CSV", style="Secondary.TButton", command=self.export_csv).pack(side="right", padx=8)
        ttk.Button(actions, text="تحديث التقرير", style="Secondary.TButton", command=self.refresh_report).pack(side="right", padx=8)
        ttk.Button(actions, text="نسخ اسم الشبكة", style="Secondary.TButton", command=self.copy_network).pack(side="right", padx=8)

        table_box = tk.Frame(body, bg="#FFFFFF", highlightbackground="#DCE5EF", highlightthickness=1)
        table_box.grid(row=4, column=0, columnspan=2, sticky="nsew")
        body.grid_rowconfigure(4, weight=1)
        tk.Label(table_box, text="ملخص الشبكات المسجلة", bg="#FFFFFF", fg="#17354F", font=("Arial", 12, "bold")).pack(anchor="e", padx=15, pady=(12, 8))
        self.table = ttk.Treeview(table_box, columns=("network", "today", "month", "all"), show="headings", height=5)
        for key, title in (("network", "الشبكة"), ("today", "اليوم"), ("month", "الشهر"), ("all", "الإجمالي")):
            self.table.heading(key, text=title)
            self.table.column(key, width=230 if key == "network" else 150, anchor="e", stretch=True)
        self.table.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        footer = tk.Frame(self, bg="#E8EEF5")
        footer.pack(fill="x")
        tk.Label(footer, textvariable=self.status, bg="#E8EEF5", fg="#415B73", font=("Arial", 10), anchor="e", justify="right").pack(fill="x", padx=24, pady=10)
        tk.Label(footer, text="F5 تحديث التقرير  •  Ctrl+E تصدير CSV  •  Ctrl+L تعيين الحد", bg="#E8EEF5", fg="#75889A", font=("Arial", 8), anchor="e", justify="right").pack(fill="x", padx=24, pady=(0, 9))
        self.refresh_table()

    def _metric_card(self, parent: tk.Widget, title: str, variable: tk.StringVar, hint: str, row: int, column: int) -> None:
        card = tk.Frame(parent, bg="#FFFFFF", highlightbackground="#DCE5EF", highlightthickness=1)
        card.grid(row=row, column=column, sticky="ew", padx=(0, 7) if column == 0 else (7, 0), pady=5)
        tk.Label(card, text=title, bg="#FFFFFF", fg="#63778B", font=("Arial", 10, "bold")).pack(anchor="e", padx=15, pady=(13, 2))
        tk.Label(card, textvariable=variable, bg="#FFFFFF", fg="#102A43", font=("Arial", 16, "bold"), anchor="e", justify="right", wraplength=360).pack(fill="x", padx=15, pady=(0, 3))
        tk.Label(card, text=hint, bg="#FFFFFF", fg="#7B8C9C", font=("Arial", 9), anchor="e", justify="right").pack(fill="x", padx=15, pady=(0, 13))

    def poll(self) -> None:
        active = self.monitor.tick()
        if active:
            key, label = active
            received, sent = self.store.today(key)
            total = received + sent
            limit, warning = self.store.limit_config(key)
            self.network.set(label)
            self.usage.set(f"{format_bytes(total)} اليوم" + (f" من حد {format_bytes(limit)}" if limit else ""))
            self.month.set(format_bytes(self.store.month_for(key)))
            percent = min(100, total * 100 / limit) if limit else 0
            self.progress["value"] = percent
            self.progress.configure(style="Critical.Horizontal.TProgressbar" if percent >= 100 else "Warning.Horizontal.TProgressbar" if percent >= warning else "Safe.Horizontal.TProgressbar")
            self.limit_status.set(f"{percent:.0f}٪ من الحد · التحذير عند {warning}٪" if limit else "عيّن حدًا لتلقي تحذير عند الاقتراب أو التجاوز")
            self.status.set(f"المراقبة نشطة على: {label} · آخر تحديث {dt.datetime.now():%H:%M:%S}")
            self.live_state.set("● مراقبة نشطة وتسجيل محلي")
            self.present_alert(self.store.claim_alert(key, total), label, total)
            if time.monotonic() - self._last_table_update > 20:
                self.refresh_table()
        else:
            self.network.set("لا توجد واجهة شبكة متصلة")
            self.status.set("اتصل بشبكة Wi‑Fi أو شبكة سلكية لبدء المراقبة.")
            self.live_state.set("● بانتظار اتصال الشبكة")

        try:
            while True:
                kind, value = self.events.get_nowait()
                if kind == "speed":
                    down, up, latency = value  # type: ignore[misc]
                    self.speed.set(f"تنزيل {down:.1f} Mbps  •  رفع {up:.1f} Mbps  •  {latency:.0f} ms")
                    quality = "قوي" if down >= 50 and latency <= 45 else "مستقر" if down >= 10 and latency <= 120 else "يحتاج مراجعة"
                    self.status.set(f"اكتمل قياس السرعة وحُفظ محليًا · تقييم الاتصال: {quality}.")
                    self.refresh_table()
                else:
                    self.status.set(f"تعذر قياس السرعة: {value}")
                self.testing = False
                self.test_button.state(["!disabled"])
        except Empty:
            pass
        self.store.flush()
        self.after(POLL_INTERVAL_MS, self.poll)

    def refresh_table(self) -> None:
        self.table.delete(*self.table.get_children())
        for label, today, month, all_time in self.store.rows():
            self.table.insert("", "end", values=(label, format_bytes(today), format_bytes(month), format_bytes(all_time)))
        self._last_table_update = time.monotonic()

    def refresh_report(self) -> None:
        self.refresh_table()
        self.status.set("تم تحديث تقرير الشبكات من السجل المحلي.")

    def copy_network(self) -> None:
        label = self.monitor.last_key
        if not label:
            self.status.set("اتصل بشبكة أولًا لنسخ اسمها.")
            return
        self.clipboard_clear()
        self.clipboard_append(self.network.get())
        self.status.set("تم نسخ اسم الشبكة الحالية إلى الحافظة.")

    def configure_limit(self) -> None:
        key = self.monitor.last_key
        if not key:
            self.status.set("اتصل بالشبكة التي تريد تعيين الحد لها أولًا.")
            return
        current, current_warning = self.store.limit_config(key)
        value = simpledialog.askfloat("حد استهلاك الشبكة", "أدخل الحد اليومي لهذه الشبكة بالميغابايت. أدخل 0 لإلغاء الحد.", initialvalue=(current / 1024 / 1024 if current else None), minvalue=0, parent=self)
        if value is None:
            return
        warning = simpledialog.askinteger("عتبة التحذير", "أدخل نسبة التحذير (من 50 إلى 99).", initialvalue=current_warning, minvalue=50, maxvalue=99, parent=self)
        if warning is None:
            return
        self.store.set_limit(key, int(value * 1024 * 1024) if value > 0 else None, warning)
        self.status.set(f"تم حفظ الحد. يظهر التحذير عند {warning}٪ وتنبيه التجاوز عند 100٪.")

    def present_alert(self, alert: tuple[str, int, int] | None, label: str, total: int) -> None:
        if not alert:
            return
        level, limit, _ = alert
        self.bell()
        title = "تم تجاوز حد البيانات" if level == "exceeded" else "اقتربت من حد البيانات"
        messagebox.showwarning(title, f"{label}: استخدمت {format_bytes(total)} من حد {format_bytes(limit)} اليوم.", parent=self)

    def run_test(self) -> None:
        if not self.monitor.last_key:
            self.status.set("اتصل بالإنترنت أولًا ثم أعد المحاولة.")
            return
        if self.testing:
            return
        self.testing = True
        self.test_button.state(["disabled"])
        self.status.set("جارِ قياس السرعة… لا تغلق التطبيق حتى يكتمل الاختبار.")
        key = self.monitor.last_key

        def worker() -> None:
            try:
                self.events.put(("speed", speed_test(key, self.store)))
            except Exception as error:  # noqa: BLE001 - message is displayed to the local user
                self.events.put(("error", str(error)))

        threading.Thread(target=worker, daemon=True).start()

    def export_csv(self) -> None:
        target = filedialog.asksaveasfilename(title="تصدير سجل NetMeter", defaultextension=".csv", initialfile=f"netmeter-{dt.date.today().isoformat()}.csv", filetypes=[("CSV", "*.csv")])
        if not target:
            return
        count = self.store.export_csv(target)
        self.status.set(f"تم تصدير {count} سجل إلى CSV.")

    def close(self) -> None:
        self.store.close()
        self.destroy()


if __name__ == "__main__":
    App().mainloop()
