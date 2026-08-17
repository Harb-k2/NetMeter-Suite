package expo.modules.netmeternative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.TrafficStats
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

class NetmeterMonitorService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val sampler = object : Runnable { override fun run() { sampleUsage(); handler.postDelayed(this, 60_000) } }
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY
  override fun onCreate() { super.onCreate(); running = true; ensureChannels(); startForeground(404, NotificationCompat.Builder(this, MONITOR_CHANNEL).setSmallIcon(android.R.drawable.stat_sys_download).setContentTitle("NetMeter يعمل").setContentText("تستمر مراقبة الشبكة أثناء التشغيل.").setOngoing(true).build()); handler.post(sampler) }
  override fun onDestroy() { handler.removeCallbacks(sampler); running = false; super.onDestroy() }

  private fun ensureChannels() { val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager; manager.createNotificationChannel(NotificationChannel(MONITOR_CHANNEL, "مراقبة NetMeter", NotificationManager.IMPORTANCE_LOW)); manager.createNotificationChannel(NotificationChannel(ALERT_CHANNEL, "تنبيهات حد البيانات", NotificationManager.IMPORTANCE_HIGH)) }
  private fun sampleUsage() {
    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE); val limit = prefs.getLong("limit_bytes", 0L)
    val key = networkKey(); val day = java.time.LocalDate.now().toString(); val rx = TrafficStats.getTotalRxBytes(); val tx = TrafficStats.getTotalTxBytes(); if (rx < 0 || tx < 0) return
    val samePeriod = prefs.getString("sample_key", null) == key && prefs.getString("sample_day", null) == day
    val baseRx = prefs.getLong("base_rx", rx); val baseTx = prefs.getLong("base_tx", tx); val total = if (samePeriod && rx >= baseRx && tx >= baseTx) (rx - baseRx) + (tx - baseTx) else 0L
    prefs.edit().putString("sample_key", key).putString("sample_day", day).putLong("base_rx", rx).putLong("base_tx", tx).putString("widget_label", labelFor(key)).putLong("widget_total", total).putLong("widget_limit", limit).putLong("widget_updated", System.currentTimeMillis()).apply(); NetmeterWidget.updateAll(this)
    if (limit <= 0L || !prefs.getBoolean("notifications_enabled", true)) return
    val warning = prefs.getInt("warning_percentage", 80).coerceIn(50, 99); val level = when { total >= limit -> "exceeded"; total >= limit * warning / 100 -> "warning"; else -> null } ?: return
    val alertKey = "alert:$key:$day"; val previous = prefs.getString(alertKey, null); if (previous == level || previous == "exceeded") return
    prefs.edit().putString(alertKey, level).apply(); val title = if (level == "exceeded") "تم تجاوز حد البيانات" else "اقتربت من حد البيانات"; val text = "${labelFor(key)}: استخدمت ${formatMb(total)} من أصل ${formatMb(limit)} اليوم."; (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(405, NotificationCompat.Builder(this, ALERT_CHANNEL).setSmallIcon(android.R.drawable.stat_notify_error).setContentTitle(title).setContentText(text).setStyle(NotificationCompat.BigTextStyle().bigText(text)).setAutoCancel(true).build())
  }
  private fun networkKey(): String { val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager; val caps = manager.getNetworkCapabilities(manager.activeNetwork); if (caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true) { val raw = try { (applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager).connectionInfo.ssid } catch (_: Exception) { null }; val name = if (raw.isNullOrBlank() || raw == "<unknown ssid>") "unknown" else raw.trim('"'); return "wifi:$name" }; return if (caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true) "cellular" else "network:other" }
  private fun labelFor(key: String) = if (key.startsWith("wifi:")) key.removePrefix("wifi:") else if (key == "cellular") "بيانات الهاتف" else "شبكة أخرى"
  private fun formatMb(value: Long) = "%.1f م.ب".format(value / 1024.0 / 1024.0)
  companion object { const val PREFS = "netmeter-limits"; const val MONITOR_CHANNEL = "netmeter-monitor"; const val ALERT_CHANNEL = "netmeter-usage-alerts"; @Volatile var running = false; fun configure(context: Context, limit: Long?, enabled: Boolean, warningPercentage: Int) { context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("limit_bytes", limit ?: 0L).putBoolean("notifications_enabled", enabled).putInt("warning_percentage", warningPercentage.coerceIn(50, 99)).apply(); NetmeterWidget.updateAll(context) }; fun start(context: Context) { val intent = Intent(context, NetmeterMonitorService::class.java); if (android.os.Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent) }; fun stop(context: Context) { context.stopService(Intent(context, NetmeterMonitorService::class.java)) } }
}
