package expo.modules.netmeternative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat

class NetmeterMonitorService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY
  override fun onCreate() { super.onCreate(); val channel = "netmeter-monitor"; (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(NotificationChannel(channel, "مراقبة NetMeter", NotificationManager.IMPORTANCE_LOW)); startForeground(404, NotificationCompat.Builder(this, channel).setSmallIcon(android.R.drawable.stat_sys_download).setContentTitle("NetMeter يعمل").setContentText("تستمر مراقبة الشبكة أثناء التشغيل.").setOngoing(true).build()) }
  companion object { fun start(context: Context) { val intent = Intent(context, NetmeterMonitorService::class.java); if (android.os.Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent) }; fun stop(context: Context) { context.stopService(Intent(context, NetmeterMonitorService::class.java)) } }
}
