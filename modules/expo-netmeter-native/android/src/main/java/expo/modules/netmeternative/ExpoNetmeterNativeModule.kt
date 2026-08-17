package expo.modules.netmeternative

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.TrafficStats
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoNetmeterNativeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoNetmeterNative")
    AsyncFunction("getSnapshot") { currentSnapshot(requireContext()) }
    AsyncFunction("openUsageAccessSettings") { context: Context -> context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); true }
    AsyncFunction("startForegroundMonitoring") { context: Context -> NetmeterMonitorService.start(context); true }
    AsyncFunction("stopForegroundMonitoring") { context: Context -> NetmeterMonitorService.stop(context); true }
  }
  private fun currentSnapshot(context: Context): Map<String, Any?> {
    val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val caps = manager.getNetworkCapabilities(manager.activeNetwork)
    val wifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    val mobile = caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true
    val connected = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
    val ssid = if (wifi) readSsid(context) else null
    val id = when { wifi -> "wifi:${ssid ?: "unknown"}"; mobile -> "cellular"; connected -> "network:other"; else -> "offline" }
    val label = when { wifi && ssid != null -> ssid; wifi -> "Wi‑Fi (اسم غير متاح)"; mobile -> "بيانات الهاتف"; connected -> "شبكة أخرى"; else -> "غير متصل" }
    val kind = when { wifi -> "wifi"; mobile -> "cellular"; connected -> "other"; else -> "offline" }
    return mapOf("networkId" to id, "networkLabel" to label, "connectionKind" to kind, "ipAddress" to null, "internetReachable" to connected, "receivedBytes" to valid(TrafficStats.getTotalRxBytes()), "transmittedBytes" to valid(TrafficStats.getTotalTxBytes()), "usageAccessGranted" to usageAllowed(context))
  }
  private fun readSsid(context: Context): String? = try { val raw = (context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager).connectionInfo.ssid; if (raw.isNullOrBlank() || raw == "<unknown ssid>") null else raw.trim('"') } catch (_: Exception) { null }
  private fun valid(value: Long): Long? = if (value < 0) null else value
  private fun usageAllowed(context: Context): Boolean { val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager; val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName) else ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName); return mode == AppOpsManager.MODE_ALLOWED }
}
