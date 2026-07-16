const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const PACKAGE_PATH = ['com', 'misykat', 'alarm'];
const TARGET_DIR = (root) => path.join(root, 'android', 'app', 'src', 'main', 'java', ...PACKAGE_PATH);

function addPermissions(manifest) {
  const perms = [
    'android.permission.WAKE_LOCK',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.USE_EXACT_ALARM',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.USE_FULL_SCREEN_INTENT',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.EXPAND_STATUS_BAR',
    'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  ];
  if (!manifest['manifest']) manifest['manifest'] = {};
  if (!manifest['manifest']['uses-permission']) manifest['manifest']['uses-permission'] = [];
  const existing = manifest['manifest']['uses-permission'].map((p) => p['$']['android:name']);
  for (const perm of perms) {
    if (!existing.includes(perm)) {
      manifest['manifest']['uses-permission'].push({ $: { 'android:name': perm } });
    }
  }
  return manifest;
}

function setActivityAttributes(manifest) {
  const app = manifest['manifest']['application'][0];
  if (!app['activity']) return manifest;
  for (const activity of app['activity']) {
    if (activity.$ && (activity.$['android:name'] === '.MainActivity' || activity.$['android:name'] === 'host.exp.exponent.MainActivity')) {
      activity.$['android:showOnLockScreen'] = 'true';
      activity.$['android:turnScreenOn'] = 'true';
      activity.$['android:showWhenLocked'] = 'true';
      activity.$['android:showForAllUsers'] = 'true';
      activity.$['android:excludeFromRecents'] = 'false';
      activity.$['android:noHistory'] = 'false';
    }
  }
  return manifest;
}

function addReceiver(manifest) {
  if (!manifest['manifest']['application']) return manifest;
  const app = manifest['manifest']['application'][0];
  if (!app['receiver']) app['receiver'] = [];
  const name = '.AlarmReceiver';
  if (app['receiver'].some((r) => r.$ && r.$['android:name'] === name)) return manifest;
  app['receiver'].push({
    $: { 'android:name': name, 'android:exported': 'true' },
    'intent-filter': [{
      action: [
        { $: { 'android:name': 'com.misykat.ALARM' } },
        { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
      ],
    }],
  });
  return manifest;
}

function addService(manifest) {
  if (!manifest['manifest']['application']) return manifest;
  const app = manifest['manifest']['application'][0];
  if (!app['service']) app['service'] = [];
  const name = '.MisykatAlarmService';
  if (app['service'].some((s) => s.$ && s.$['android:name'] === name)) return manifest;
  app['service'].push({
    $: { 'android:name': name, 'android:exported': 'false', 'android:foregroundServiceType': 'dataSync' },
  });
  return manifest;
}

function writeAlarmReceiver(projectRoot) {
  const dir = TARGET_DIR(projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, 'AlarmReceiver.java');
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, ALARM_RECEIVER_CODE, 'utf8');
    console.log('Wrote AlarmReceiver.java');
  }
}

function writeAlarmService(projectRoot) {
  const dir = TARGET_DIR(projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, 'MisykatAlarmService.java');
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, ALARM_SERVICE_CODE, 'utf8');
    console.log('Wrote MisykatAlarmService.java');
  }
}

function patchMainActivity(projectRoot) {
  const javaRoot = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java');
  function findFile(dir, name) {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        const found = findFile(path.join(dir, e.name), name);
        if (found) return found;
      } else if (e.name === name) return path.join(dir, e.name);
    }
    return null;
  }
  const act = findFile(javaRoot, 'MainActivity.kt') || findFile(javaRoot, 'MainActivity.java');
  if (!act) return;
  let content = fs.readFileSync(act, 'utf8');
  const original = content;
  if (content.includes('onNewIntent')) { console.log('MainActivity already patched'); return; }
  if (act.endsWith('.kt')) {
    if (!content.includes('import android.content.Intent')) {
      content = content.replace(/^import expo\./m, 'import android.content.Intent\nimport expo.');
    }
    content = content.replace(
      /override fun createReactActivityDelegate\(\)/,
      `\n  override fun onNewIntent(intent: Intent) {\n    super.onNewIntent(intent)\n    setIntent(intent)\n  }\n\n  override fun createReactActivityDelegate()`
    );
    const match = content.match(/override fun onCreate\(savedInstanceState: Bundle\?\)\s*\{[^}]*\}/s);
    if (match && !match[0].includes('setShowWhenLocked')) {
      content = content.replace(
        match[0],
        match[0].replace(
          /super\.onCreate\(null\)/,
          `super.onCreate(null)\n    if (Build.VERSION.SDK_INT >= 27) {\n      setShowWhenLocked(true)\n      setTurnScreenOn(true)\n    } else {\n      window.addFlags(\n        android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or\n        android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or\n        android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON\n      )\n    }`
        )
      );
    }
  }
  if (content !== original) {
    fs.writeFileSync(act, content, 'utf8');
    console.log('Patched MainActivity');
  }
}

function patchAppBuildGradle(projectRoot) {
  const fp = path.join(projectRoot, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(fp)) return;
  let content = fs.readFileSync(fp, 'utf8');
  const original = content;

  if (content.includes('splits {')) {
    console.log('build.gradle already has splits');
    return;
  }

  content = content.replace(
    /android\s*\{/,
    `android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a', 'x86_64'
            universalApk true
        }
    }`
  );

  if (content !== original) {
    fs.writeFileSync(fp, content, 'utf8');
    console.log('Patched build.gradle with ABI splits');
  }
}

const ALARM_RECEIVER_CODE = `package com.misykat.alarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
  private static final String TAG = "MisykatAlarm";
  private static final String PREFS_NAME = "misykat_alarm";
  private static final String KEY_PENDING_ALARM = "pendingAlarmData";

  @Override
  public void onReceive(Context context, Intent intent) {
    try {
      String alarmId = intent.getStringExtra("alarmId");
      String contentType = intent.getStringExtra("contentType");
      boolean isPrayer = intent.getBooleanExtra("isPrayer", false);
      int hour = intent.getIntExtra("hour", 7);
      int minute = intent.getIntExtra("minute", 0);

      savePendingAlarm(context, alarmId, contentType, isPrayer);

      if (isPrayer || alarmId == null) {
        rescheduleForTomorrow(context, alarmId, hour, minute, contentType, isPrayer);
      }

      Intent svc = new Intent(context, MisykatAlarmService.class);
      svc.putExtra("alarmId", alarmId);
      svc.putExtra("contentType", contentType);
      svc.putExtra("isPrayer", isPrayer);
      svc.putExtra("hour", hour);
      svc.putExtra("minute", minute);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(svc);
      } else {
        context.startService(svc);
      }
    } catch (Exception e) {
      Log.e(TAG, "Failed to start alarm service", e);
    }
  }

  private void rescheduleForTomorrow(Context context, String alarmId, int hour, int minute, String contentType, boolean isPrayer) {
    if (isPrayer || alarmId == null) return;
    try {
      java.util.Calendar cal = java.util.Calendar.getInstance();
      cal.add(java.util.Calendar.DAY_OF_YEAR, 1);
      cal.set(java.util.Calendar.HOUR_OF_DAY, hour);
      cal.set(java.util.Calendar.MINUTE, minute);
      cal.set(java.util.Calendar.SECOND, 0);
      cal.set(java.util.Calendar.MILLISECOND, 0);

      Intent rescheduleIntent = new Intent("com.misykat.ALARM");
      rescheduleIntent.setPackage(context.getPackageName());
      rescheduleIntent.putExtra("alarmId", alarmId);
      rescheduleIntent.putExtra("contentType", contentType);
      rescheduleIntent.putExtra("isPrayer", isPrayer);
      rescheduleIntent.putExtra("hour", hour);
      rescheduleIntent.putExtra("minute", minute);

      android.app.PendingIntent pi = android.app.PendingIntent.getBroadcast(
        context, alarmId.hashCode(), rescheduleIntent,
        android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
      );

      android.app.AlarmManager am = (android.app.AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
      if (am != null) {
        android.app.AlarmManager.AlarmClockInfo info = new android.app.AlarmManager.AlarmClockInfo(cal.getTimeInMillis(), pi);
        am.setAlarmClock(info, pi);
      }
    } catch (Exception e) {
      Log.e(TAG, "Failed to reschedule alarm", e);
    }
  }

  private void savePendingAlarm(Context context, String alarmId, String contentType, boolean isPrayer) {
    try {
      SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
      String data = (alarmId != null ? alarmId : "") + "|" + (contentType != null ? contentType : "") + "|" + isPrayer;
      prefs.edit().putString(KEY_PENDING_ALARM, data).apply();
    } catch (Exception e) {
      Log.e(TAG, "Failed to save pending alarm", e);
    }
  }
}
`;

const ALARM_SERVICE_CODE = `package com.misykat.alarm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

public class MisykatAlarmService extends Service {
  private static final String TAG = "MisykatAlarmSvc";
  private static final String CHANNEL_ID = "alarm_foreground";
  private static final int FOREGROUND_NOTIF_ID = 9000;
  private static final int NOTIFICATION_ID_BASE = 9001;
  private PowerManager.WakeLock wl;

  @Override
  public IBinder onBind(Intent intent) { return null; }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null) { stopSelf(); return START_NOT_STICKY; }

    String alarmId = intent.getStringExtra("alarmId");
    String contentType = intent.getStringExtra("contentType");
    boolean isPrayer = intent.getBooleanExtra("isPrayer", false);
    int hour = intent.getIntExtra("hour", 7);
    int minute = intent.getIntExtra("minute", 0);

    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
    if (pm != null) {
      wl = pm.newWakeLock(
        PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
        "Misykat:AlarmSvcWL"
      );
      wl.acquire(30000);
    }

    forceRingerNormal();
    showForegroundNotification();
    showAlarmNotification(alarmId, contentType, isPrayer);
    launchAlarmActivity(alarmId, contentType, isPrayer);

    new android.os.Handler(getMainLooper()).postDelayed(() -> {
      releaseWakeLock();
      stopForeground(STOP_FOREGROUND_REMOVE);
      stopSelf();
    }, 60000);

    return START_NOT_STICKY;
  }

  private void showForegroundNotification() {
    ensureChannel();
    Notification notif = new Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setContentTitle("Misykat")
      .setContentText("Alarm berbunyi")
      .setPriority(Notification.PRIORITY_MIN)
      .setOngoing(true)
      .build();
    startForeground(FOREGROUND_NOTIF_ID, notif);
  }

  private void showAlarmNotification(String alarmId, String contentType, boolean isPrayer) {
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;

    Intent activityIntent = new Intent(this, MainActivity.class);
    activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    if (alarmId != null) activityIntent.putExtra("alarmId", alarmId);
    if (contentType != null) activityIntent.putExtra("contentType", contentType);
    activityIntent.putExtra("isPrayer", isPrayer);
    activityIntent.putExtra("fromAlarmReceiver", true);

    int rc = alarmId != null ? alarmId.hashCode() : NOTIFICATION_ID_BASE;
    PendingIntent pi = PendingIntent.getActivity(this, rc, activityIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Bundle data = new Bundle();
    if (alarmId != null) data.putString("alarmId", alarmId);
    if (contentType != null) data.putString("contentType", contentType);
    data.putBoolean("isPrayer", isPrayer);
    data.putBoolean("fromAlarm", true);

    Notification notif = new Notification.Builder(this, "alarm_call")
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setContentTitle("Misykat")
      .setContentText("Waktunya bangun!")
      .setPriority(Notification.PRIORITY_MAX)
      .setCategory(Notification.CATEGORY_CALL)
      .setFullScreenIntent(pi, true)
      .setAutoCancel(true)
      .setOngoing(true)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setDefaults(Notification.DEFAULT_ALL)
      .setExtras(data)
      .build();

    nm.notify(rc, notif);
  }

  private void launchAlarmActivity(String alarmId, String contentType, boolean isPrayer) {
    try {
      Intent i = new Intent(this, MainActivity.class);
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      if (alarmId != null) i.putExtra("alarmId", alarmId);
      if (contentType != null) i.putExtra("contentType", contentType);
      i.putExtra("isPrayer", isPrayer);
      i.putExtra("fromAlarmReceiver", true);
      i.putExtra("directLaunch", true);

      PendingIntent pi = PendingIntent.getActivity(this,
        (alarmId != null ? alarmId.hashCode() : 9001) + 1000, i,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      pi.send();
    } catch (Exception e) {
      Log.e(TAG, "launch failed", e);
    }
  }

  private void forceRingerNormal() {
    try {
      AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
      if (am != null) {
        am.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
        am.setStreamVolume(AudioManager.STREAM_RING, am.getStreamMaxVolume(AudioManager.STREAM_RING), 0);
        am.setStreamVolume(AudioManager.STREAM_ALARM, am.getStreamMaxVolume(AudioManager.STREAM_ALARM), 0);
      }
    } catch (Exception e) {
      Log.w(TAG, "ringer failed", e);
    }
  }

  private void ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm == null) return;
      NotificationChannel ch = nm.getNotificationChannel(CHANNEL_ID);
      if (ch == null) {
        ch = new NotificationChannel(CHANNEL_ID, "Alarm Layanan", NotificationManager.IMPORTANCE_MIN);
        ch.setDescription("Notifikasi layanan alarm latar depan");
        ch.setShowBadge(false);
        nm.createNotificationChannel(ch);
      }
    }
  }

  private void releaseWakeLock() {
    if (wl != null && wl.isHeld()) { try { wl.release(); } catch (Exception ignored) {} }
  }

  @Override
  public void onDestroy() {
    releaseWakeLock();
    super.onDestroy();
  }
}
`;

module.exports = function withAndroidAlarm(config) {
  config = withAndroidManifest(config, (cfg) => {
    cfg.modResults = addPermissions(cfg.modResults);
    cfg.modResults = setActivityAttributes(cfg.modResults);
    cfg.modResults = addReceiver(cfg.modResults);
    cfg.modResults = addService(cfg.modResults);
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      writeAlarmReceiver(cfg.modRequest.projectRoot);
      writeAlarmService(cfg.modRequest.projectRoot);
      patchMainActivity(cfg.modRequest.projectRoot);
      patchAppBuildGradle(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  return config;
};
