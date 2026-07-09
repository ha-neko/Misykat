const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const PACKAGE_PATH = ['com', 'misykat', 'alarm'];
const PACKAGE_DIR = path.join(...PACKAGE_PATH);
const TARGET_DIR = (root) => path.join(root, 'android', 'app', 'src', 'main', 'java', ...PACKAGE_PATH);

// --- Permissions ---
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

// --- Activity attributes ---
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

// --- Register AlarmReceiver ---
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

// --- Write native Java files ---
function writeNativeFiles(projectRoot) {
  const dir = TARGET_DIR(projectRoot);
  fs.mkdirSync(dir, { recursive: true });

  // AlarmReceiver.java
  const alarmReceiverPath = path.join(dir, 'AlarmReceiver.java');
  if (!fs.existsSync(alarmReceiverPath)) {
    fs.writeFileSync(alarmReceiverPath, ALARM_RECEIVER_CODE, 'utf8');
    console.log('Wrote AlarmReceiver.java');
  }

  // MisykatAlarmModule.java
  const modulePath = path.join(dir, 'MisykatAlarmModule.java');
  if (!fs.existsSync(modulePath)) {
    fs.writeFileSync(modulePath, MODULE_CODE, 'utf8');
    console.log('Wrote MisykatAlarmModule.java');
  }

  // MisykatAlarmPackage.java
  const packagePath = path.join(dir, 'MisykatAlarmPackage.java');
  if (!fs.existsSync(packagePath)) {
    fs.writeFileSync(packagePath, PACKAGE_CODE, 'utf8');
    console.log('Wrote MisykatAlarmPackage.java');
  }
}

// --- Fix MainApplication ---
function patchMainApplication(mainApplication) {
  const imports = [
    'import com.misykat.alarm.MisykatAlarmPackage;',
  ];

  let content = mainApplication;

  for (const imp of imports) {
    if (!content.includes(imp)) {
      content = content.replace(
        /^package /m,
        imp + '\n\npackage '
      );
    }
  }

  if (!content.includes('MisykatAlarmPackage')) {
    content = content.replace(
      /packages\.add\(new (MainReactPackage|ReactPackage|.*Package)\(\)\);/,
      (match) => match + '\n      packages.add(new MisykatAlarmPackage());'
    );
  }

  return content;
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
    Log.d(TAG, "Alarm received!");

    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
    PowerManager.WakeLock wl = pm.newWakeLock(
      PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
      "Misykat:WakeLock"
    );
    wl.acquire(10000);

    Intent i = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    if (i != null) {
      i.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK |
        Intent.FLAG_ACTIVITY_SINGLE_TOP |
        Intent.FLAG_ACTIVITY_CLEAR_TOP |
        Intent.FLAG_ACTIVITY_NO_USER_ACTION
      );

      if (intent.hasExtra("contentType")) i.putExtra("contentType", intent.getStringExtra("contentType"));
      if (intent.hasExtra("alarmId")) i.putExtra("alarmId", intent.getStringExtra("alarmId"));
      i.putExtra("isPrayer", intent.getBooleanExtra("isPrayer", false));
      i.putExtra("fromAlarmReceiver", true);

      context.startActivity(i);
    }

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
import androidx.annotation.Nullable;

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
  private static String sPendingAlarmId = "";
  private static String sPendingContentType = "";
  private static boolean sPendingIsPrayer = false;
  private static boolean sHasPendingAlarm = false;

  MisykatAlarmModule(ReactApplicationContext context) {
    super(context);
    checkForAlarmIntent(context);
  }

  private void checkForAlarmIntent(ReactApplicationContext context) {
    try {
      Activity activity = context.getCurrentActivity();
      if (activity == null) return;
      Intent intent = activity.getIntent();
      if (intent != null && intent.getBooleanExtra("fromAlarmReceiver", false)) {
        sPendingAlarmId = intent.getStringExtra("alarmId") != null ? intent.getStringExtra("alarmId") : "";
        sPendingContentType = intent.getStringExtra("contentType") != null ? intent.getStringExtra("contentType") : "";
        sPendingIsPrayer = intent.getBooleanExtra("isPrayer", false);
        sHasPendingAlarm = true;
        Log.d(TAG, "Found alarm intent: " + sPendingContentType);
      }
    } catch (Exception ignored) {}
  }

  @NonNull
  @Override
  public String getName() {
    return "MisykatAlarmModule";
  }

  @ReactMethod
  public void getInitialAlarmData(Promise promise) {
    try {
      WritableMap result = Arguments.createMap();
      result.putString("alarmId", sPendingAlarmId);
      result.putString("contentType", sPendingContentType);
      result.putBoolean("isPrayer", sPendingIsPrayer);
      result.putBoolean("fromAlarm", sHasPendingAlarm);

      // Clear after reading
      sHasPendingAlarm = false;
      sPendingAlarmId = "";
      sPendingContentType = "";
      sPendingIsPrayer = false;

      promise.resolve(result);
    } catch (Exception e) {
      promise.reject("INIT_DATA_ERROR", e.getMessage(), e);
    }
  }
    try {
      Context context = getReactApplicationContext();
      AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
      if (am == null) {
        promise.reject("NO_ALARM_SERVICE", "AlarmManager not available");
        return;
      }

      Intent intent = new Intent(ACTION_ALARM);
      intent.setPackage(context.getPackageName());
      intent.putExtra("alarmId", alarmId);
      intent.putExtra("contentType", contentType);
      intent.putExtra("isPrayer", isPrayer);

      int requestCode = alarmId.hashCode();
      PendingIntent pi = PendingIntent.getBroadcast(
        context, requestCode, intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );

      Calendar cal = Calendar.getInstance();
      cal.set(Calendar.HOUR_OF_DAY, hour);
      cal.set(Calendar.MINUTE, minute);
      cal.set(Calendar.SECOND, 0);
      cal.set(Calendar.MILLISECOND, 0);

      if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
        cal.add(Calendar.DAY_OF_MONTH, 1);
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
      } else {
        am.setExact(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
      }

      // Also schedule for repeating (daily)
      am.setRepeating(
        AlarmManager.RTC_WAKEUP,
        cal.getTimeInMillis(),
        AlarmManager.INTERVAL_DAY,
        pi
      );

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
      if (am == null) {
        promise.reject("NO_ALARM_SERVICE", "AlarmManager not available");
        return;
      }

      Intent intent = new Intent(ACTION_ALARM);
      intent.setPackage(context.getPackageName());

      int requestCode = alarmId.hashCode();
      PendingIntent pi = PendingIntent.getBroadcast(
        context, requestCode, intent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );

      am.cancel(pi);
      pi.cancel();

      Log.d(TAG, "Cancelled alarm " + alarmId);
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("CANCEL_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void cancelAllAlarms(Promise promise) {
    try {
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("CANCEL_ALL_ERROR", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void getInitialAlarmData(Promise promise) {
    try {
      WritableMap result = Arguments.createMap();
      result.putString("alarmId", "");
      result.putString("contentType", "");
      result.putBoolean("isPrayer", false);
      result.putBoolean("fromAlarm", false);

      promise.resolve(result);
    } catch (Exception e) {
      promise.reject("INIT_DATA_ERROR", e.getMessage(), e);
    }
  }
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
  @NonNull
  @Override
  public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new MisykatAlarmModule(reactContext));
    return modules;
  }

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
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

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      writeNativeFiles(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);

  config = withMainApplication(config, (cfg) => {
    cfg.modResults = patchMainApplication(cfg.modResults);
    return cfg;
  });

  return config;
};
