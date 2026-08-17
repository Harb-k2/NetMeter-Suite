#!/usr/bin/env python3
"""NetMeter Suite: local per-network monitor for Windows and Kali Linux."""
from __future__ import annotations

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
from tkinter import ttk

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
        self.db.commit()

    def record(self, key: str, label: str, received: int, transmitted: int) -> None:
        self.db.execute("INSERT INTO daily_usage(network_key,label,date,received,transmitted) VALUES(?,?,?,?,?) ON CONFLICT(network_key,date) DO UPDATE SET label=excluded.label,received=received+excluded.received,transmitted=transmitted+excluded.transmitted", (key, label, dt.date.today().isoformat(), received, transmitted)); self.db.commit()

    def today(self, key: str) -> tuple[int, int]:
        row = self.db.execute("SELECT received,transmitted FROM daily_usage WHERE network_key=? AND date=?", (key, dt.date.today().isoformat())).fetchone()
        return row if row else (0, 0)

    def rows(self) -> list[tuple[str, int, int]]:
        return self.db.execute("SELECT MAX(label),SUM(received),SUM(transmitted) FROM daily_usage GROUP BY network_key ORDER BY MAX(date) DESC").fetchall()

    def speed(self, key: str, download: float, upload: float, latency: float) -> None:
        self.db.execute("INSERT INTO speed_results(network_key,measured_at,download,upload,latency) VALUES(?,?,?,?,?)", (key, dt.datetime.now().isoformat(timespec="seconds"), download, upload, latency)); self.db.commit()


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
        self.network, self.usage, self.speed, self.status = tk.StringVar(value="جارِ التحقق…"), tk.StringVar(value="—"), tk.StringVar(value="لم يُجر اختبار بعد"), tk.StringVar(value="تتم المراقبة محليًا")
        self.build(); self.after(100, self.poll)

    def build(self) -> None:
        style = ttk.Style(self); style.theme_use("clam"); style.configure("Treeview", rowheight=31, font=("Arial", 11)); style.configure("TButton", font=("Arial", 11, "bold"), padding=8)
        header = tk.Frame(self, bg="#102A43", height=105); header.pack(fill="x"); tk.Label(header, text="NetMeter Suite", fg="white", bg="#102A43", font=("Arial", 24, "bold")).pack(anchor="e", padx=28, pady=(22, 2)); tk.Label(header, text="مراقبة سرعة الإنترنت والاستهلاك حسب الشبكة", fg="#B5C3D3", bg="#102A43", font=("Arial", 11)).pack(anchor="e", padx=28)
        body = tk.Frame(self, bg="#F6F9FC"); body.pack(fill="both", expand=True, padx=22, pady=18)
        for title, variable in (("الشبكة الحالية", self.network), ("استهلاك اليوم لهذه الشبكة", self.usage), ("آخر قياس", self.speed)):
            card = tk.Frame(body, bg="white", highlightbackground="#DCE5EF", highlightthickness=1); card.pack(fill="x", pady=5); tk.Label(card, text=title, bg="white", fg="#5D6B7B", font=("Arial", 10)).pack(anchor="e", padx=14, pady=(10, 0)); tk.Label(card, textvariable=variable, bg="white", fg="#102A43", font=("Arial", 15, "bold")).pack(anchor="e", padx=14, pady=(2, 10))
        actions = tk.Frame(body, bg="#F6F9FC"); actions.pack(fill="x", pady=9); ttk.Button(actions, text="قياس السرعة الآن", command=self.run_test).pack(side="right"); ttk.Button(actions, text="تحديث الشبكات", command=self.refresh_table).pack(side="right", padx=8)
        self.table = ttk.Treeview(body, columns=("network", "usage"), show="headings", height=5); self.table.heading("network", text="الشبكة"); self.table.heading("usage", text="الاستهلاك الإجمالي"); self.table.column("network", width=350, anchor="e"); self.table.column("usage", width=190, anchor="e"); self.table.pack(fill="both", expand=True); tk.Label(body, textvariable=self.status, bg="#F6F9FC", fg="#5D6B7B", font=("Arial", 10)).pack(anchor="e", pady=(8, 0)); self.refresh_table()

    def poll(self) -> None:
        active = self.monitor.tick()
        if active:
            key, label = active; received, sent = self.store.today(key); self.network.set(label); self.usage.set(f"تنزيل {format_bytes(received)}   •   رفع {format_bytes(sent)}")
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
        for label, received, sent in self.store.rows(): self.table.insert("", "end", values=(label, format_bytes(received + sent)))

    def run_test(self) -> None:
        if not self.monitor.last_key: self.status.set("اتصل بالإنترنت أولاً ثم أعد المحاولة"); return
        self.status.set("جارِ قياس السرعة…")
        def worker() -> None:
            try: self.events.put(("speed", speed_test(self.monitor.last_key, self.store)))
            except Exception as error: self.events.put(("error", str(error)))
        threading.Thread(target=worker, daemon=True).start()


if __name__ == "__main__": App().mainloop()
