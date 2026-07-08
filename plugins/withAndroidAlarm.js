const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

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
  ];

  if (!manifest['manifest']) manifest['manifest'] = {};
  if (!manifest['manifest']['uses-permission']) manifest['manifest']['uses-permission'] = [];

  const existing = manifest['manifest']['uses-permission'].map(
    (p) => p['$']['android:name']
  );

  for (const perm of perms) {
    if (!existing.includes(perm)) {
      manifest['manifest']['uses-permission'].push({
        $: { 'android:name': perm },
      });
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
    }
  }

  return manifest;
}

function addReceiver(manifest) {
  if (!manifest['manifest']['application']) return manifest;
  const app = manifest['manifest']['application'][0];
  if (!app['receiver']) app['receiver'] = [];

  const receiverName = '.AlarmReceiver';
  const alreadyExists = app['receiver'].some(
    (r) => r.$ && r.$['android:name'] === receiverName
  );
  if (alreadyExists) return manifest;

  app['receiver'].push({
    $: {
      'android:name': receiverName,
      'android:exported': 'false',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'com.misykat.ALARM' } }],
      },
    ],
  });

  return manifest;
}

function writeAlarmReceiver(projectRoot) {
  const packagePath = 'com/misykat/alarm';
  const targetDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', ...packagePath.split('/'));
  const targetFile = path.join(targetDir, 'AlarmReceiver.java');

  if (fs.existsSync(targetFile)) return;

  fs.mkdirSync(targetDir, { recursive: true });

  const code = `package com.misykat.alarm;

import android.app.ActivityManager;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
  private static final String TAG = "AlarmReceiver";

  @Override
  public void onReceive(Context context, Intent intent) {
    Log.d(TAG, "Alarm received!");

    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
    PowerManager.WakeLock wl = pm.newWakeLock(
      PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
      "Misykat:AlarmWakeLock"
    );
    wl.acquire(10000);

    Intent activityIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    if (activityIntent != null) {
      activityIntent.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK |
        Intent.FLAG_ACTIVITY_SINGLE_TOP |
        Intent.FLAG_ACTIVITY_CLEAR_TOP |
        Intent.FLAG_ACTIVITY_NO_USER_ACTION
      );

      if (intent.hasExtra("contentType")) {
        activityIntent.putExtra("contentType", intent.getStringExtra("contentType"));
      }
      activityIntent.putExtra("isPrayer", intent.getBooleanExtra("isPrayer", false));
      activityIntent.putExtra("alarmId", intent.getStringExtra("alarmId"));
      activityIntent.putExtra("fromAlarmReceiver", true);

      context.startActivity(activityIntent);
    }

    if (wl.isHeld()) {
      try { wl.release(); } catch (Exception e) { }
    }
  }
}
`;

  fs.writeFileSync(targetFile, code, 'utf8');
  console.log('Wrote AlarmReceiver.java to ' + targetFile);
}

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
      return cfg;
    },
  ]);

  return config;
};
