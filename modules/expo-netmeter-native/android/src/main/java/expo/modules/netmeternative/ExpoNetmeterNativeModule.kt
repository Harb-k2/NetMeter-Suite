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
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec

class ExpoNetmeterNativeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoNetmeterNative")
    AsyncFunction("getSnapshot") { currentSnapshot(requireNotNull(appContext.reactContext)) }
    AsyncFunction("openUsageAccessSettings") { context: Context -> context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); true }
    AsyncFunction("configureUsageLimit") { context: Context, limitBytes: Double?, notificationsEnabled: Boolean, warningPercentage: Double -> NetmeterMonitorService.configure(context, limitBytes?.toLong(), notificationsEnabled, warningPercentage.toInt()); true }
    AsyncFunction("startForegroundMonitoring") { context: Context -> NetmeterMonitorService.start(context); true }
    AsyncFunction("stopForegroundMonitoring") { context: Context -> NetmeterMonitorService.stop(context); true }
    AsyncFunction("encryptBackup") { payload: String, password: String -> encrypt(payload, password) }
    AsyncFunction("decryptBackup") { envelope: String, password: String -> decrypt(envelope, password) }
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
  private fun key(password: String, salt: ByteArray) = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(PBEKeySpec(password.toCharArray(), salt, 210_000, 256)).encoded
  private fun encrypt(payload: String, password: String): String { val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }; val iv = ByteArray(12).also { SecureRandom().nextBytes(it) }; val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, javax.crypto.spec.SecretKeySpec(key(password, salt), "AES"), GCMParameterSpec(128, iv)); val data = cipher.doFinal(payload.toByteArray(Charsets.UTF_8)); return listOf("NMB1", Base64.encodeToString(salt, Base64.NO_WRAP), Base64.encodeToString(iv, Base64.NO_WRAP), Base64.encodeToString(data, Base64.NO_WRAP)).joinToString(":") }
  private fun decrypt(envelope: String, password: String): String { val parts = envelope.split(":"); require(parts.size == 4 && parts[0] == "NMB1") { "تنسيق النسخة الاحتياطية غير صالح." }; val salt = Base64.decode(parts[1], Base64.NO_WRAP); val iv = Base64.decode(parts[2], Base64.NO_WRAP); val data = Base64.decode(parts[3], Base64.NO_WRAP); val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, javax.crypto.spec.SecretKeySpec(key(password, salt), "AES"), GCMParameterSpec(128, iv)); return String(cipher.doFinal(data), Charsets.UTF_8) }
}
