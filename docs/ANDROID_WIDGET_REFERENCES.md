# مراجع تنفيذ ويدجت Android

يعتمد ويدجت NetMeter على `AppWidgetProvider` و`RemoteViews` بصفته ويدجت معلومات موجزًا، مع زر تحديث وفتح التطبيق. يرسل تطبيق Android أو خدمة المراقبة الأمامية تحديثًا مباشرًا إلى `AppWidgetManager` عند وصول قراءة استخدام جديدة، بدلاً من جدولة تحديثات متقاربة تستهلك البطارية.

توصي وثائق Android بأن لا تقل التحديثات الدورية عبر `updatePeriodMillis` عن 30 دقيقة، وأن تستخدم التحديثات الجزئية أو المباشرة عند الحاجة، ولذلك يضبط NetMeter الفترة على 30 دقيقة كاحتياط ويحدث الودجت عند تشغيل خدمة المراقبة أو الضغط على زر التحديث [1].

## المراجع

[1] [Android Developers — Create an advanced widget](https://developer.android.com/develop/ui/views/appwidgets/advanced)

[2] [Android Developers — App widgets overview](https://developer.android.com/develop/ui/views/appwidgets/overview)
