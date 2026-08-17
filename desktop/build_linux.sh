#!/usr/bin/env bash
set -euo pipefail
python3 -m pip install --user --upgrade pip
python3 -m pip install --user -r requirements.txt
python3 -m PyInstaller --noconfirm --windowed --name NetMeterSuite netmeter_desktop.py
echo "تم إنشاء البرنامج في dist/NetMeterSuite/NetMeterSuite"
