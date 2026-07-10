package com.misykat.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MisykatAlarmModule : Module() {
  private val TAG = "MisykatAlarmModule"

  override fun definition() = ModuleDefinition {
    Name("MisykatAlarm")

    Function("scheduleAlarm") { alarmId: String, timeInMillis: Double, contentType: String, isPrayer: Boolean ->
      scheduleAlarm(alarmId, timeInMillis, contentType, isPrayer)
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
  }

  companion object {
    @JvmStatic
    private var pendingAlarmData: Map<String, Any?>? = null

    @JvmStatic
    fun firePendingAlarm(alarmId: String?, contentType: String?, isPrayer: Boolean) {
      val data = mutableMapOf<String, Any?>()
      data["fromAlarm"] = true
      if (alarmId != null) data["alarmId"] = alarmId
      if (contentType != null) data["contentType"] = contentType
      data["isPrayer"] = isPrayer
      pendingAlarmData = data
    }
  }

  private fun checkPendingAlarm(): Map<String, Any?> {
    val data = pendingAlarmData
    pendingAlarmData = null
    return data ?: mapOf("fromAlarm" to false)
  }

  private fun scheduleAlarm(alarmId: String, timeInMillis: Double, contentType: String, isPrayer: Boolean) {
    val context = appContext.reactContext ?: run {
      Log.e(TAG, "No react context")
      return
    }
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: run {
      Log.e(TAG, "No alarm service")
      return
    }

    val intent = Intent().apply {
      action = "com.misykat.ALARM"
      setPackage(context.packageName)
      putExtra("alarmId", alarmId)
      putExtra("contentType", contentType)
      putExtra("isPrayer", isPrayer)
    }

    val pendingIntent = PendingIntent.getBroadcast(
      context,
      alarmId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timeInMillis.toLong(), pendingIntent)
    Log.d(TAG, "Scheduled alarm $alarmId at $timeInMillis")
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
    if (!intent.getBooleanExtra("fromAlarmReceiver", false)) {
      return mapOf("fromAlarm" to false)
    }
    val data = mutableMapOf<String, Any?>()
    data["fromAlarm"] = true
    intent.getStringExtra("alarmId")?.let { data["alarmId"] = it }
    intent.getStringExtra("contentType")?.let { data["contentType"] = it }
    data["isPrayer"] = intent.getBooleanExtra("isPrayer", false)
    intent.removeExtra("fromAlarmReceiver")
    return data
  }
}
