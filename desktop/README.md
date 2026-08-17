# NetMeter Suite لسطح المكتب

يعمل البرنامج محليًا على Windows وKali Linux، ويخزن قاعدة SQLite في `~/.netmeter-suite/netmeter.sqlite3` دون إرسال أسماء الشبكات أو سجل الاستهلاك إلى خادم.

| النظام | التشغيل من المصدر | بناء ملف تنفيذي |
| --- | --- | --- |
| Windows | `py -m pip install -r requirements.txt` ثم `py netmeter_desktop.py` | افتح PowerShell وشغّل `./build_windows.ps1` |
| Kali Linux | `python3 -m pip install --user -r requirements.txt` ثم `python3 netmeter_desktop.py` | `chmod +x build_linux.sh && ./build_linux.sh` |

يُحسب الاستهلاك من فروق عدادات واجهة الشبكة النشطة كل خمس ثوانٍ؛ لذلك يبدأ التسجيل بعد تشغيل البرنامج ولا يشمل تاريخًا سابقًا. في Wi‑Fi يحاول البرنامج قراءة SSID، وإن تعذر ذلك يحفظ الاستعمال باسم واجهة الشبكة كي لا تختلط السجلات.
