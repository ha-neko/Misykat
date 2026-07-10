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

function writeAlarmReceiver(projectRoot) {
  const dir = TARGET_DIR(projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, 'AlarmReceiver.java');
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, ALARM_RECEIVER_CODE, 'utf8');
    console.log('Wrote AlarmReceiver.java');
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

const ALARM_RECEIVER_CODE = `package com.misykat.alarm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
  private static final String TAG = "MisykatAlarm";
  private static final String CHANNEL_ID = "alarm";
  private static final int NOTIFICATION_ID_BASE = 9001;
  private static final String PREFS_NAME = "misykat_alarm";
  private static final String KEY_PENDING_ALARM = "pendingAlarmData";

  @Override
  public void onReceive(Context context, Intent intent) {
    PowerManager.WakeLock wl = null;
    PendingResult pendingResult = goAsync();

    try {
      PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
      wl = pm.newWakeLock(
        PowerManager.FULL_WAKE_LOCK |
        PowerManager.ACQUIRE_CAUSES_WAKEUP |
        PowerManager.ON_AFTER_RELEASE,
        "Misykat:WakeLock"
      );
      wl.acquire(15000);

      String alarmId = intent.getStringExtra("alarmId");
      String contentType = intent.getStringExtra("contentType");
      boolean isPrayer = intent.getBooleanExtra("isPrayer", false);

      savePendingAlarm(context, alarmId, contentType, isPrayer);

      showFullScreenNotification(context, alarmId, contentType, isPrayer);

      launchAlarmActivity(context, alarmId, contentType, isPrayer);
    } catch (Exception e) {
      Log.e(TAG, "Failed to process alarm", e);
    } finally {
      if (wl != null && wl.isHeld()) {
        try { wl.release(); } catch (Exception ignored) {}
      }
      pendingResult.finish();
    }
  }

  private void launchAlarmActivity(Context context, String alarmId, String contentType, boolean isPrayer) {
    try {
      Intent launchIntent = new Intent(context, MainActivity.class);
      launchIntent.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK |
        Intent.FLAG_ACTIVITY_SINGLE_TOP |
        Intent.FLAG_ACTIVITY_CLEAR_TOP |
        Intent.FLAG_ACTIVITY_NO_USER_ACTION
      );
      launchIntent.putExtra("alarmId", alarmId);
      launchIntent.putExtra("contentType", contentType);
      launchIntent.putExtra("isPrayer", isPrayer);
      launchIntent.putExtra("fromAlarmReceiver", true);
      launchIntent.putExtra("directLaunch", true);

      context.startActivity(launchIntent);
    } catch (Exception e) {
      Log.e(TAG, "Direct activity launch failed", e);
    }
  }

  private void savePendingAlarm(Context context, String alarmId, String contentType, boolean isPrayer) {
    try {
      SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
      String data = alarmId + "|" + (contentType != null ? contentType : "") + "|" + isPrayer;
      prefs.edit().putString(KEY_PENDING_ALARM, data).apply();
    } catch (Exception e) {
      Log.e(TAG, "Failed to save pending alarm", e);
    }
  }

  private void showFullScreenNotification(Context context, String alarmId, String contentType, boolean isPrayer) {
    NotificationManager notificationManager =
      (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (notificationManager == null) return;

    ensureChannel(notificationManager);

    Intent activityIntent = new Intent(context, MainActivity.class);
    activityIntent.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK |
      Intent.FLAG_ACTIVITY_SINGLE_TOP |
      Intent.FLAG_ACTIVITY_CLEAR_TOP |
      Intent.FLAG_ACTIVITY_NO_USER_ACTION
    );
    if (alarmId != null) activityIntent.putExtra("alarmId", alarmId);
    if (contentType != null) activityIntent.putExtra("contentType", contentType);
    activityIntent.putExtra("isPrayer", isPrayer);
    activityIntent.putExtra("fromAlarmReceiver", true);

    int requestCode = alarmId != null ? alarmId.hashCode() : NOTIFICATION_ID_BASE;
    PendingIntent fullScreenIntent = PendingIntent.getActivity(
      context, requestCode, activityIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    Notification notification = new Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setContentTitle("Misykat")
      .setContentText("Waktunya bangun!")
      .setPriority(Notification.PRIORITY_MAX)
      .setCategory(Notification.CATEGORY_ALARM)
      .setFullScreenIntent(fullScreenIntent, true)
      .setAutoCancel(true)
      .setOngoing(false)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setDefaults(Notification.DEFAULT_ALL)
      .build();

    notificationManager.notify(requestCode, notification);
  }

  private void ensureChannel(NotificationManager manager) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = manager.getNotificationChannel(CHANNEL_ID);
      if (channel == null) {
        channel = new NotificationChannel(CHANNEL_ID, "Misykat", NotificationManager.IMPORTANCE_HIGH);
      } else {
        channel.setImportance(NotificationManager.IMPORTANCE_HIGH);
      }
      channel.setDescription("Misykat alarm notifications");
      channel.setBypassDnd(true);
      channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
      channel.enableVibration(true);
      channel.setShowBadge(true);
      channel.setSound(null, null);
      manager.createNotificationChannel(channel);
    }
  }
}
`;

module.exports = function withAndroidAlarm(config) {
  config = withAndroidManifest(config, (cfg) => {
    cfg.modResults = addPermissions(cfg.modResults);
    cfg.modResults = setActivityAttributes(cfg.modResults);
    cfg.modResults = addReceiver(cfg.modResults);
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      writeAlarmReceiver(cfg.modRequest.projectRoot);
      patchMainActivity(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  return config;
};
