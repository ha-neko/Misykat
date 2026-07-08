const { withAndroidManifest } = require('@expo/config-plugins');

function addPermissions(manifest) {
  const perms = [
    'android.permission.WAKE_LOCK',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.USE_EXACT_ALARM',
    'android.permission.SCHEDULE_EXACT_ALARM',
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
    }
  }

  return manifest;
}

module.exports = function withAndroidAlarm(config) {
  config = withAndroidManifest(config, (cfg) => {
    cfg.modResults = addPermissions(cfg.modResults);
    cfg.modResults = setActivityAttributes(cfg.modResults);
    return cfg;
  });

  return config;
};
