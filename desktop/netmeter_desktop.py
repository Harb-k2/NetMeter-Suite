#!/usr/bin/env python3
"""NetMeter Suite: local per-network monitor for Windows and Kali Linux."""
from __future__ import annotations

import datetime as dt
import csv
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
    if not limit or limit <= 0: return None
    if total >= limit: return "exceeded"
    if total >= limit * max(50, min(99, warning_percentage)) / 100: return "warning"
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
                if value: return value
        return None
    for line in run(["nmcli", "-t", "-f", "ACTIVE,SSID", "dev", "wifi"]).splitlines():
        if line.startswith("yes:") and line[4:].strip(): return line[4:].strip()
    return run(["iwgetid", "-r"]).strip() or None


def active_interface() -> str | None:
    stats, counters = psutil.net_if_stats(), psutil.net_io_counters(pernic=True)
    choices = [name for name, stat in stats.items() if stat.isup and not name.lower().startswith(("lo", "loopback")) and name in counters]
    return max(choices, key=lambda name: counters[name].bytes_recv + counters[name].bytes_sent) if choices else None


class Store:
    def __init__(self) -> None:
        APP_DIR.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS daily_usage(network_key TEXT NOT NULL,label TEXT NOT NULL,date TEXT NOT NULL,received INTEGER NOT NULL DEFAULT 0,transmitted INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(network_key,date))")
        self.db.execute("CREATE TABLE IF NOT EXISTS speed_results(id INTEGER PRIMARY KEY,network_key TEXT NOT NULL,measured_at TEXT NOT NULL,download REAL,upload REAL,latency REAL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS network_limits(network_key TEXT PRIMARY KEY,limit_bytes INTEGER NOT NULL,warning_percentage INTEGER NOT NULL DEFAULT 80)")
        self.db.execute("CREATE TABLE IF NOT EXISTS usage_alerts(network_key TEXT NOT NULL,date TEXT NOT NULL,level TEXT NOT NULL,PRIMARY KEY(network_key,date))")
        if "warning_percentage" not in {row[1] for row in self.db.execute("PRAGMA table_info(network_limits)")}: self.db.execute("ALTER TABLE network_limits ADD COLUMN warning_percentage INTEGER NOT NULL DEFAULT 80")
        self.db.commit()

    def record(self, key: str, label: str, received: int, transmitted: int) -> None:
        self.db.execute("INSERT INTO daily_usage(network_key,label,date,received,transmitted) VALUES(?,?,?,?,?) ON CONFLICT(network_key,date) DO UPDATE SET label=excluded.label,received=received+excluded.received,transmitted=transmitted+excluded.transmitted", (key, label, dt.date.today().isoformat(), received, transmitted)); self.db.commit()

    def today(self, key: str) -> tuple[int, int]:
        row = self.db.execute("SELECT received,transmitted FROM daily_usage WHERE network_key=? AND date=?", (key, dt.date.today().isoformat())).fetchone()
        return row if row else (0, 0)

    def rows(self) -> list[tuple[str, int, int, int]]:
        today, month = dt.date.today().isoformat(), f"{dt.date.today():%Y-%m}%"
        return self.db.execute("SELECT MAX(label),SUM(CASE WHEN date=? THEN received+transmitted ELSE 0 END),SUM(CASE WHEN date LIKE ? THEN received+transmitted ELSE 0 END),SUM(received+transmitted) FROM daily_usage GROUP BY network_key ORDER BY MAX(date) DESC", (today, month)).fetchall()

    def speed(self, key: str, download: float, upload: float, latency: float) -> None:
        self.db.execute("INSERT INTO speed_results(network_key,measured_at,download,upload,latency) VALUES(?,?,?,?,?)", (key, dt.datetime.now().isoformat(timespec="seconds"), download, upload, latency)); self.db.commit()

    def limit_config(self, key: str) -> tuple[int | None, int]:
        row = self.db.execute("SELECT limit_bytes,warning_percentage FROM network_limits WHERE network_key=?", (key,)).fetchone()
        return (row[0], row[1]) if row else (None, 80)
    def limit(self, key: str) -> int | None: return self.limit_config(key)[0]

    def set_limit(self, key: str, limit: int | None, warning_percentage: int = 80) -> None:
        if limit is None: self.db.execute("DELETE FROM network_limits WHERE network_key=?", (key,))
        else: self.db.execute("INSERT INTO network_limits(network_key,limit_bytes,warning_percentage) VALUES(?,?,?) ON CONFLICT(network_key) DO UPDATE SET limit_bytes=excluded.limit_bytes,warning_percentage=excluded.warning_percentage", (key, limit, max(50, min(99, warning_percentage))))
        self.db.commit()

    def claim_alert(self, key: str, total: int) -> tuple[str, int] | None:
        limit, warning = self.limit_config(key); level = usage_alert_level(total, limit, warning)
        if not level or not limit: return None
        date = dt.date.today().isoformat(); previous = self.db.execute("SELECT level FROM usage_alerts WHERE network_key=? AND date=?", (key, date)).fetchone()
        if previous and (previous[0] == level or previous[0] == "exceeded"): return None
        self.db.execute("INSERT INTO usage_alerts(network_key,date,level) VALUES(?,?,?) ON CONFLICT(network_key,date) DO UPDATE SET level=excluded.level", (key, date, level)); self.db.commit()
        return level, limit, warning

    def export_csv(self, target: str) -> int:
        rows = self.db.execute("SELECT label,network_key,date,received,transmitted,received+transmitted FROM daily_usage ORDER BY date DESC,label").fetchall()
        with open(target, "w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle); writer.writerow(["الشبكة", "المعرف", "التاريخ", "التنزيل بالبايت", "الرفع بالبايت", "الإجمالي بالبايت"]); writer.writerows(rows)
        return len(rows)


class Monitor:
    def __init__(self, store: Store) -> None: self.store, self.last_key, self.last_counter = store, None, None
    def tick(self) -> tuple[str, str] | None:
        interface = active_interface()
        if not interface: self.last_key, self.last_counter = None, None; return None
        name = ssid(); key, label = (f"wifi:{name}", name) if name else (f"interface:{interface}", f"واجهة {interface}")
        counter = psutil.net_io_counters(pernic=True)[interface]; current = (counter.bytes_recv, counter.bytes_sent)
        if key == self.last_key:
            delta = safe_delta(self.last_counter, current)
            if delta: self.store.record(key, label, *delta)
        self.last_key, self.last_counter = key, current
        return key, label


def speed_test(key: str, store: Store) -> tuple[float, float, float]:
    started = time.perf_counter()
    with urllib.request.urlopen(f"https://speed.cloudflare.com/__down?bytes=0&t={time.time()}", timeout=20) as response: response.read(1)
    latency = (time.perf_counter() - started) * 1000
    size, started = 2_000_000, time.perf_counter()
    with urllib.request.urlopen(f"https://speed.cloudflare.com/__down?bytes={size}&t={time.time()}", timeout=45) as response: downloaded = len(response.read())
    download = downloaded * 8 / ((time.perf_counter() - started) * 1_000_000)
    payload, started = b"0" * 500_000, time.perf_counter()
    with urllib.request.urlopen(urllib.request.Request(f"https://speed.cloudflare.com/__up?t={time.time()}", data=payload, method="POST"), timeout=45) as response: response.read(1)
    upload = len(payload) * 8 / ((time.perf_counter() - started) * 1_000_000)
    store.speed(key, download, upload, latency); return download, upload, latency


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__(); self.title("NetMeter Suite"); self.geometry("680x570"); self.minsize(580, 470); self.configure(bg="#F6F9FC")
        self.store, self.monitor, self.events = Store(), Monitor(Store()), Queue(); self.store = self.monitor.store
        self.network, self.usage, self.month, self.speed, self.status = tk.StringVar(value="جارِ التحقق…"), tk.StringVar(value="—"), tk.StringVar(value="—"), tk.StringVar(value="لم يُجر اختبار بعد"), tk.StringVar(value="تتم المراقبة محليًا")
        self.build(); self.after(100, self.poll)

    def build(self) -> None:
        style = ttk.Style(self); style.theme_use("clam"); style.configure("Treeview", rowheight=31, font=("Arial", 11)); style.configure("TButton", font=("Arial", 11, "bold"), padding=8)
        header = tk.Frame(self, bg="#102A43", height=105); header.pack(fill="x"); tk.Label(header, text="NetMeter Suite", fg="white", bg="#102A43", font=("Arial", 24, "bold")).pack(anchor="e", padx=28, pady=(22, 2)); tk.Label(header, text="مراقبة سرعة الإنترنت والاستهلاك حسب الشبكة", fg="#B5C3D3", bg="#102A43", font=("Arial", 11)).pack(anchor="e", padx=28)
        body = tk.Frame(self, bg="#F6F9FC"); body.pack(fill="both", expand=True, padx=22, pady=18)
        for title, variable in (("الشبكة الحالية", self.network), ("استهلاك اليوم لهذه الشبكة", self.usage), ("استهلاك هذا الشهر", self.month), ("آخر قياس", self.speed)):
            card = tk.Frame(body, bg="white", highlightbackground="#DCE5EF", highlightthickness=1); card.pack(fill="x", pady=5); tk.Label(card, text=title, bg="white", fg="#5D6B7B", font=("Arial", 10)).pack(anchor="e", padx=14, pady=(10, 0)); tk.Label(card, textvariable=variable, bg="white", fg="#102A43", font=("Arial", 15, "bold")).pack(anchor="e", padx=14, pady=(2, 10))
        self.progress = ttk.Progressbar(body, mode="determinate", maximum=100); self.progress.pack(fill="x", pady=(2, 8)); actions = tk.Frame(body, bg="#F6F9FC"); actions.pack(fill="x", pady=9); ttk.Button(actions, text="قياس السرعة الآن", command=self.run_test).pack(side="right"); ttk.Button(actions, text="تعيين حد الشبكة", command=self.configure_limit).pack(side="right", padx=8); ttk.Button(actions, text="تصدير CSV", command=self.export_csv).pack(side="right", padx=8); ttk.Button(actions, text="تحديث الشبكات", command=self.refresh_table).pack(side="right", padx=8)
        self.table = ttk.Treeview(body, columns=("network", "today", "month", "all"), show="headings", height=5); [self.table.heading(key, text=title) for key, title in (("network", "الشبكة"), ("today", "اليوم"), ("month", "الشهر"), ("all", "الإجمالي"))]; [self.table.column(key, width=150 if key == "network" else 115, anchor="e") for key in ("network", "today", "month", "all")]; self.table.pack(fill="both", expand=True); tk.Label(body, textvariable=self.status, bg="#F6F9FC", fg="#5D6B7B", font=("Arial", 10)).pack(anchor="e", pady=(8, 0)); self.refresh_table()

    def poll(self) -> None:
        active = self.monitor.tick()
        if active:
            key, label = active; received, sent = self.store.today(key); total = received + sent; limit, warning = self.store.limit_config(key); self.network.set(label); self.usage.set(f"{format_bytes(total)} اليوم" + (f" من حد {format_bytes(limit)}" if limit else "")); month = next((row[2] for row in self.store.rows() if row[0] == label), 0); self.month.set(format_bytes(month)); self.progress["value"] = min(100, total * 100 / limit) if limit else 0; self.status.set(f"التحذير عند {warning}٪" if limit else "عيّن حدًا للحصول على التنبيهات"); self.present_alert(self.store.claim_alert(key, total), label, total)
        else: self.network.set("لا توجد واجهة شبكة متصلة")
        try:
            while True:
                kind, value = self.events.get_nowait()
                if kind == "speed":
                    down, up, latency = value; self.speed.set(f"تنزيل {down:.1f} Mbps   •   رفع {up:.1f} Mbps   •   {latency:.0f} ms"); self.status.set("اكتمل قياس السرعة"); self.refresh_table()
                else: self.status.set(f"تعذر قياس السرعة: {value}")
        except Empty: pass
        self.after(5000, self.poll)

    def refresh_table(self) -> None:
        self.table.delete(*self.table.get_children())
        for label, today, month, all_time in self.store.rows(): self.table.insert("", "end", values=(label, format_bytes(today), format_bytes(month), format_bytes(all_time)))

    def configure_limit(self) -> None:
        key = self.monitor.last_key
        if not key: self.status.set("اتصل بالشبكة التي تريد تعيين الحد لها أولاً"); return
        current, current_warning = self.store.limit_config(key); value = simpledialog.askfloat("حد استهلاك الشبكة", "أدخل الحد اليومي لهذه الشبكة بالميغابايت. أدخل 0 لإلغاء الحد.", initialvalue=(current / 1024 / 1024 if current else None), minvalue=0, parent=self)
        if value is None: return
        warning = simpledialog.askinteger("عتبة التحذير", "أدخل نسبة التحذير (من 50 إلى 99).", initialvalue=current_warning, minvalue=50, maxvalue=99, parent=self)
        if warning is None: return
        self.store.set_limit(key, int(value * 1024 * 1024) if value > 0 else None, warning); self.status.set(f"تم حفظ الحد. يظهر التحذير عند {warning}٪ وتنبيه تجاوز عند 100٪.")

    def present_alert(self, alert: tuple[str, int, int] | None, label: str, total: int) -> None:
        if not alert: return
        level, limit, _ = alert; self.bell()
        if level == "exceeded": messagebox.showwarning("تم تجاوز حد البيانات", f"{label}: استخدمت {format_bytes(total)} من حد {format_bytes(limit)} اليوم.", parent=self)
        else: messagebox.showwarning("اقتربت من حد البيانات", f"{label}: استخدمت {format_bytes(total)} من حد {format_bytes(limit)} اليوم.", parent=self)

    def run_test(self) -> None:
        if not self.monitor.last_key: self.status.set("اتصل بالإنترنت أولاً ثم أعد المحاولة"); return
        self.status.set("جارِ قياس السرعة…")
        def worker() -> None:
            try: self.events.put(("speed", speed_test(self.monitor.last_key, self.store)))
            except Exception as error: self.events.put(("error", str(error)))
        threading.Thread(target=worker, daemon=True).start()

    def export_csv(self) -> None:
        target = filedialog.asksaveasfilename(title="تصدير سجل NetMeter", defaultextension=".csv", initialfile=f"netmeter-{dt.date.today().isoformat()}.csv", filetypes=[("CSV", "*.csv")])
        if not target: return
        count = self.store.export_csv(target); self.status.set(f"تم تصدير {count} سجل إلى CSV")


if __name__ == "__main__": App().mainloop()
