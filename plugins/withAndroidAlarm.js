const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const PACKAGE_PATH = ['com', 'misykat', 'alarm'];
const TARGET_DIR = (root) => path.join(root, 'android', 'app', 'src', 'main', 'java', ...PACKAGE_PATH);

// ===================================================================
// AndroidManifest modifiers
// ===================================================================

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

// ===================================================================
// Native file writer (AlarmReceiver.java + MisykatAlarmModule.java + MisykatAlarmPackage.java)
// ===================================================================

function writeNativeFiles(projectRoot) {
  const dir = TARGET_DIR(projectRoot);
  fs.mkdirSync(dir, { recursive: true });

  const files = {
    'AlarmReceiver.java': ALARM_RECEIVER_CODE,
    'MisykatAlarmModule.java': MODULE_CODE,
    'MisykatAlarmPackage.java': PACKAGE_CODE,
  };

  for (const [name, code] of Object.entries(files)) {
    const fp = path.join(dir, name);
    if (!fs.existsSync(fp)) {
      fs.writeFileSync(fp, code, 'utf8');
      console.log('Wrote ' + name);
    }
  }
}

// ===================================================================
// MainApplication.kt patcher (register MisykatAlarmPackage)
// ===================================================================

function patchMainApplication(contents, language) {
  if (contents.includes('MisykatAlarmPackage')) return contents;
  if (language === 'kt') {
    contents = contents.replace(
      /\nimport expo\./,
      '\nimport com.misykat.alarm.MisykatAlarmPackage\nimport expo.'
    );
    contents = contents.replace(
      /PackageList\(this\)\.packages\.apply \{/,
      'PackageList(this).packages.apply {\n      add(MisykatAlarmPackage())'
    );
  } else if (language === 'java') {
    contents = contents.replace(
      /^import /m,
      'import com.misykat.alarm.MisykatAlarmPackage;\nimport '
    );
    contents = contents.replace(
      /return new PackageList\(this\)\.getPackages\(\);/,
      'List<ReactPackage> packages = new PackageList(this).getPackages();\n    packages.add(new MisykatAlarmPackage());\n    return packages;'
    );
  }
  return contents;
}

// ===================================================================
// MainActivity.kt patcher (onNewIntent + setShowWhenLocked)
// ===================================================================

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
          `super.onCreate(null)\n    if (Build.VERSION.SDK_INT >= 27) {\n      setShowWhenLocked(true)\n      setTurnScreenOn(true)\n    } else {\n      @Suppress("DEPRECATION")\n      window.addFlags(\n        android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or\n        android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or\n        android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON\n      )\n    }`
        )
      );
    }
  }
  if (content !== original) {
    fs.writeFileSync(act, content, 'utf8');
    console.log('Patched MainActivity');
  }
}

// ===================================================================
// Java source code
// ===================================================================

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

    if (intent.hasExtra("contentType"))
      i.putExtra("contentType", intent.getStringExtra("contentType"));
    if (intent.hasExtra("alarmId"))
      i.putExtra("alarmId", intent.getStringExtra("alarmId"));
    i.putExtra("isPrayer", intent.getBooleanExtra("isPrayer", false));
    i.putExtra("fromAlarmReceiver", true);

    context.startActivity(i);

    try { if (wl.isHeld()) wl.release(); } catch (Exception ignored) {}
  }
}
`;

const MODULE_CODE = `package com.misykat.alarm;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.util.Calendar;

public class MisykatAlarmModule extends ReactContextBaseJavaModule {
  private static final String TAG = "MisykatAlarmModule";
  private static final String ACTION_ALARM = "com.misykat.ALARM";

  MisykatAlarmModule(ReactApplicationContext context) {
    super(context);
  }

  @NonNull
  @Override
  public String getName() { return "MisykatAlarmModule"; }

  @ReactMethod
  public void getInitialAlarmData(Promise promise) {
    try {
      WritableMap result = Arguments.createMap();
      Activity activity = getCurrentActivity();
      if (activity != null) {
        Intent intent = activity.getIntent();
        if (intent != null && intent.getBooleanExtra("fromAlarmReceiver", false)) {
          result.putString("alarmId", intent.getStringExtra("alarmId") != null ? intent.getStringExtra("alarmId") : "");
          result.putString("contentType", intent.getStringExtra("contentType") != null ? intent.getStringExtra("contentType") : "");
          result.putBoolean("isPrayer", intent.getBooleanExtra("isPrayer", false));
          result.putBoolean("fromAlarm", true);
          intent.removeExtra("fromAlarmReceiver");
          promise.resolve(result);
          return;
        }
      }
      result.putBoolean("fromAlarm", false);
      promise.resolve(result);
    } catch (Exception e) {
      promise.reject("INIT_DATA_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void scheduleAlarm(int hour, int minute, String alarmId, String contentType, boolean isPrayer, Promise promise) {
    try {
      Context context = getReactApplicationContext();
      AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
      if (am == null) { promise.reject("NO_ALARM_SERVICE", "AlarmManager not available"); return; }

      Intent intent = new Intent(ACTION_ALARM);
      intent.setPackage(context.getPackageName());
      intent.putExtra("alarmId", alarmId);
      intent.putExtra("contentType", contentType);
      intent.putExtra("isPrayer", isPrayer);

      int requestCode = alarmId.hashCode();
      PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

      Calendar cal = Calendar.getInstance();
      cal.set(Calendar.HOUR_OF_DAY, hour);
      cal.set(Calendar.MINUTE, minute);
      cal.set(Calendar.SECOND, 0);
      cal.set(Calendar.MILLISECOND, 0);
      if (cal.getTimeInMillis() <= System.currentTimeMillis())
        cal.add(Calendar.DAY_OF_MONTH, 1);

      am.setRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(),
        AlarmManager.INTERVAL_DAY, pi);

      Log.d(TAG, "Scheduled alarm " + alarmId + " at " + hour + ":" + minute);
      WritableMap result = Arguments.createMap();
      result.putString("alarmId", alarmId);
      result.putDouble("triggerAt", cal.getTimeInMillis());
      promise.resolve(result);
    } catch (Exception e) {
      Log.e(TAG, "Failed to schedule alarm", e);
      promise.reject("SCHEDULE_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void cancelAlarm(String alarmId, Promise promise) {
    try {
      Context context = getReactApplicationContext();
      AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
      if (am == null) { promise.reject("NO_ALARM_SERVICE", "AlarmManager not available"); return; }

      Intent intent = new Intent(ACTION_ALARM);
      intent.setPackage(context.getPackageName());
      int requestCode = alarmId.hashCode();
      PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      am.cancel(pi);
      pi.cancel();
      Log.d(TAG, "Cancelled alarm " + alarmId);
      promise.resolve(true);
    } catch (Exception e) { promise.reject("CANCEL_ERROR", e.getMessage(), e); }
  }

  @ReactMethod
  public void cancelAllAlarms(Promise promise) { promise.resolve(true); }
}
`;

const PACKAGE_CODE = `package com.misykat.alarm;
import androidx.annotation.NonNull;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class MisykatAlarmPackage implements ReactPackage {
  @NonNull @Override
  public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext rc) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new MisykatAlarmModule(rc));
    return modules;
  }
  @NonNull @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext rc) {
    return Collections.emptyList();
  }
}
`;

// ===================================================================
// Plugin export
// ===================================================================

module.exports = function withAndroidAlarm(config) {
  config = withAndroidManifest(config, (cfg) => {
    cfg.modResults = addPermissions(cfg.modResults);
    cfg.modResults = setActivityAttributes(cfg.modResults);
    cfg.modResults = addReceiver(cfg.modResults);
    return cfg;
  });

  config = withMainApplication(config, (cfg) => {
    cfg.modResults.contents = patchMainApplication(
      cfg.modResults.contents,
      cfg.modResults.language
    );
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      writeNativeFiles(cfg.modRequest.projectRoot);
      patchMainActivity(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  return config;
};
