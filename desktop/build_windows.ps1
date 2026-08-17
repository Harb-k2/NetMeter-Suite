$ErrorActionPreference = "Stop"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m PyInstaller --noconfirm --windowed --name NetMeterSuite netmeter_desktop.py
Write-Host "تم إنشاء البرنامج في dist\NetMeterSuite\NetMeterSuite.exe"
