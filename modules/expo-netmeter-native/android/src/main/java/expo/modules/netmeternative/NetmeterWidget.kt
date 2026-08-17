package expo.modules.netmeternative

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class NetmeterWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { update(context, manager, it) } }
  override fun onReceive(context: Context, intent: Intent) { super.onReceive(context, intent); if (intent.action == ACTION_REFRESH) updateAll(context) }
  companion object {
    const val ACTION_REFRESH = "expo.modules.netmeternative.REFRESH_WIDGET"
    fun updateAll(context: Context) { val manager = AppWidgetManager.getInstance(context); val ids = manager.getAppWidgetIds(ComponentName(context, NetmeterWidget::class.java)); ids.forEach { update(context, manager, it) } }
    private fun update(context: Context, manager: AppWidgetManager, id: Int) { val prefs = context.getSharedPreferences(NetmeterMonitorService.PREFS, Context.MODE_PRIVATE); val total = prefs.getLong("widget_total", 0L); val limit = prefs.getLong("widget_limit", 0L); val label = prefs.getString("widget_label", "افتح NetMeter للتحديث") ?: "NetMeter"; val views = RemoteViews(context.packageName, R.layout.netmeter_widget); views.setTextViewText(R.id.network_label, label); views.setTextViewText(R.id.usage_value, format(total)); views.setTextViewText(R.id.limit_value, if (limit > 0) "${format(total)} من ${format(limit)} اليوم" else "لم يتم ضبط حد يومي"); val launch = context.packageManager.getLaunchIntentForPackage(context.packageName); views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, 100, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)); val refresh = Intent(context, NetmeterWidget::class.java).setAction(ACTION_REFRESH); views.setOnClickPendingIntent(R.id.refresh_widget, PendingIntent.getBroadcast(context, 101, refresh, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)); manager.updateAppWidget(id, views) }
    private fun format(value: Long) = if (value >= 1024L * 1024L * 1024L) "%.1f غ.ب".format(value / 1024.0 / 1024.0 / 1024.0) else "%.0f م.ب".format(value / 1024.0 / 1024.0)
  }
}
