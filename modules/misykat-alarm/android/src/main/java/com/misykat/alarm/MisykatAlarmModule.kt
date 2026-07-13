package com.misykat.alarm

import android.app.AlarmManager
import android.app.AlarmManager.AlarmClockInfo
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MisykatAlarmModule : Module() {
  private val TAG = "MisykatAlarmModule"
  private val PREFS_NAME = "misykat_alarm"
  private val KEY_PENDING_ALARM = "pendingAlarmData"

  override fun definition() = ModuleDefinition {
    Name("MisykatAlarm")

    Function("scheduleAlarm") { alarmId: String, timeInMillis: Double, contentType: String, isPrayer: Boolean ->
      scheduleAlarm(alarmId, timeInMillis.toLong(), contentType, isPrayer)
    }

    Function("cancelAlarm") { alarmId: String ->
      cancelAlarm(alarmId)
    }

    Function("cancelAllAlarms") {
      cancelAllAlarms()
    }

    Function("getInitialAlarmData") {
      getInitialAlarmData()
    }

    Function("checkPendingAlarm") {
      checkPendingAlarm()
    }

    Function("canUseFullScreenIntent") {
      canUseFullScreenIntent()
    }

    Function("openFullScreenIntentSettings") {
      openFullScreenIntentSettings()
    }

    Function("canScheduleExactAlarm") {
      canScheduleExactAlarm()
    }

    Function("isIgnoringBatteryOptimizations") {
      isIgnoringBatteryOptimizations()
    }

    Function("openBatteryOptimizationSettings") {
      openBatteryOptimizationSettings()
    }
  }

  private fun scheduleAlarm(alarmId: String, timeInMillis: Long, contentType: String, isPrayer: Boolean) {
    val context = appContext.reactContext ?: run {
      Log.e(TAG, "No react context")
      return
    }
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: run {
      Log.e(TAG, "No alarm service")
      return
    }

    val cal = java.util.Calendar.getInstance().apply { this.timeInMillis = timeInMillis }
    val hour = cal.get(java.util.Calendar.HOUR_OF_DAY)
    val minute = cal.get(java.util.Calendar.MINUTE)

    val intent = Intent().apply {
      action = "com.misykat.ALARM"
      setPackage(context.packageName)
      putExtra("alarmId", alarmId)
      putExtra("contentType", contentType)
      putExtra("isPrayer", isPrayer)
      putExtra("hour", hour)
      putExtra("minute", minute)
    }

    val pendingIntent = PendingIntent.getBroadcast(
      context,
      alarmId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val alarmInfo = AlarmClockInfo(timeInMillis, null)
    try {
      alarmManager.setAlarmClock(alarmInfo, pendingIntent)
      Log.d(TAG, "Scheduled alarm $alarmId at $timeInMillis via setAlarmClock")
    } catch (e1: SecurityException) {
      Log.w(TAG, "setAlarmClock denied, trying setExactAndAllowWhileIdle", e1)
      try {
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent)
        Log.d(TAG, "Scheduled alarm $alarmId via setExactAndAllowWhileIdle")
      } catch (e2: SecurityException) {
        Log.w(TAG, "setExactAndAllowWhileIdle also denied, trying setWindow", e2)
        try {
          alarmManager.setWindow(AlarmManager.RTC_WAKEUP, timeInMillis, 30000L, pendingIntent)
          Log.d(TAG, "Scheduled alarm $alarmId via setWindow (30s window)")
        } catch (e3: SecurityException) {
          Log.e(TAG, "All exact scheduling methods denied, alarm $alarmId will not fire on time")
        }
      }
    }
  }

  private fun cancelAlarm(alarmId: String) {
    val context = appContext.reactContext ?: return
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return

    val intent = Intent().apply {
      action = "com.misykat.ALARM"
      setPackage(context.packageName)
    }

    val pendingIntent = PendingIntent.getBroadcast(
      context,
      alarmId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    alarmManager.cancel(pendingIntent)
    pendingIntent.cancel()
    Log.d(TAG, "Cancelled alarm $alarmId")
  }

  private fun cancelAllAlarms() {
    Log.d(TAG, "cancelAllAlarms delegated to JS")
  }

  private fun getInitialAlarmData(): Map<String, Any?>? {
    val activity = appContext.currentActivity ?: return null
    val intent = activity.intent ?: return null

    val directLaunch = intent.getBooleanExtra("directLaunch", false)
    if (!intent.getBooleanExtra("fromAlarmReceiver", false) && !directLaunch) {
      return mapOf("fromAlarm" to false)
    }

    val data = mutableMapOf<String, Any?>()
    data["fromAlarm"] = true
    intent.getStringExtra("alarmId")?.let { data["alarmId"] = it }
    intent.getStringExtra("contentType")?.let { data["contentType"] = it }
    data["isPrayer"] = intent.getBooleanExtra("isPrayer", false)
    intent.removeExtra("fromAlarmReceiver")
    intent.removeExtra("directLaunch")
    return data
  }

  private fun canUseFullScreenIntent(): Boolean {
    if (Build.VERSION.SDK_INT < 34) return true
    val nm = appContext.reactContext?.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return true
    return nm.canUseFullScreenIntent()
  }

  private fun openFullScreenIntentSettings() {
    if (Build.VERSION.SDK_INT < 34) return
    val activity = appContext.currentActivity ?: return
    try {
      val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
        data = android.net.Uri.parse("package:${activity.packageName}")
      }
      activity.startActivity(intent)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to open FSI settings", e)
    }
  }

  private fun canScheduleExactAlarm(): Boolean {
    if (Build.VERSION.SDK_INT < 31) return true
    val context = appContext.reactContext ?: return false
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return false
    return alarmManager.canScheduleExactAlarms()
  }

  private fun isIgnoringBatteryOptimizations(): Boolean {
    val context = appContext.reactContext ?: return false
    val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return false
    return pm.isIgnoringBatteryOptimizations(context.packageName)
  }

  private fun openBatteryOptimizationSettings() {
    val context = appContext.reactContext ?: return
    try {
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = android.net.Uri.parse("package:${context.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    } catch (e: Exception) {
      try {
        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      } catch (e2: Exception) {
        Log.e(TAG, "Failed to open battery optimization settings", e2)
      }
    }
  }

  private fun checkPendingAlarm(): Map<String, Any?> {
    val context = appContext.reactContext ?: return mapOf("fromAlarm" to false)
    try {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val raw = prefs.getString(KEY_PENDING_ALARM, null) ?: return mapOf("fromAlarm" to false)
      prefs.edit().remove(KEY_PENDING_ALARM).apply()
      val parts = raw.split("|", limit = 3)
      if (parts.size < 3) return mapOf("fromAlarm" to false)
      return mapOf(
        "fromAlarm" to true,
        "alarmId" to parts[0],
        "contentType" to (parts[1].ifEmpty { null } ?: ""),
        "isPrayer" to (parts[2].toBoolean())
      )
    } catch (e: Exception) {
      Log.e(TAG, "Failed to read pending alarm", e)
      return mapOf("fromAlarm" to false)
    }
  }
}
