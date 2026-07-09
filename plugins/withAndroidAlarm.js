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

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
  private static final String TAG = "MisykatAlarm";

  @Override
  public void onReceive(Context context, Intent intent) {
    Log.d(TAG, "Alarm received! action=" + intent.getAction());

    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
    PowerManager.WakeLock wl = pm.newWakeLock(
      PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
      "Misykat:WakeLock"
    );
    wl.acquire(10000);

    Intent i = new Intent(context, MainActivity.class);
    i.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK |
      Intent.FLAG_ACTIVITY_SINGLE_TOP |
      Intent.FLAG_ACTIVITY_CLEAR_TOP |
      Intent.FLAG_ACTIVITY_NO_USER_ACTION
    );

    if (intent.hasExtra("alarmId"))
      i.putExtra("alarmId", intent.getStringExtra("alarmId"));
    if (intent.hasExtra("contentType"))
      i.putExtra("contentType", intent.getStringExtra("contentType"));
    i.putExtra("isPrayer", intent.getBooleanExtra("isPrayer", false));
    i.putExtra("fromAlarmReceiver", true);

    context.startActivity(i);

    try { if (wl.isHeld()) wl.release(); } catch (Exception ignored) {}
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
