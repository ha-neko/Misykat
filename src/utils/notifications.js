import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import { scheduleNativeAlarm, cancelNativeAlarm } from './nativeAlarm';

const ALARMS_KEY = 'alarms';
const PRAYER_ALARMS_KEY = 'prayerAlarms';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});



async function setupChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarm', {
      name: 'Misykat',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [1000, 500, 1000, 500, 1000, 800, 1000, 500, 2000, 500, 1000, 500],
      enableVibrate: true,
      bypassDnd: true,
      enableLights: true,
      lightColor: '#00b894',
      showBadge: true,
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function requestPermissions() {
  await setupChannel();

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      await PermissionsAndroid.request('android.permission.USE_FULL_SCREEN_INTENT');
      await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
      await PermissionsAndroid.request('android.permission.SCHEDULE_EXACT_ALARM');
    } catch {}
  }

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: true,
    },
    android: {
      channelId: 'alarm',
    },
  });
  return status === 'granted';
}

export async function scheduleAlarm(alarmData) {
  const { hour, minute, label, type, contentType } = alarmData;
  await setupChannel();

  const alarmId = Date.now().toString();
  await scheduleNativeAlarm(hour, minute, alarmId, contentType, false);

  const alarm = {
    id: alarmId,
    hour,
    minute,
    label,
    type,
    contentType: contentType || 'random',
    enabled: true,
    createdAt: Date.now(),
  };

  const alarms = await getAlarms();
  alarms.push(alarm);
  await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
  return alarm;
}

export async function schedulePrayerAlarms(prayerTimes) {
  const existing = await getPrayerAlarms();
  for (const prayer of existing) {
    await cancelNativeAlarm(prayer.id);
  }

  const prayerAlarms = [];

  for (const [key, time] of Object.entries(prayerTimes)) {
    if (key === 'sunrise') continue;

    const alarmId = `prayer_${key}`;
    await scheduleNativeAlarm(time.getHours(), time.getMinutes(), alarmId, key, true);

    prayerAlarms.push({
      id: alarmId,
      prayer: key,
      hour: time.getHours(),
      minute: time.getMinutes(),
      enabled: true,
    });
  }

  await AsyncStorage.setItem(PRAYER_ALARMS_KEY, JSON.stringify(prayerAlarms));
  return prayerAlarms;
}

export async function cancelPrayerAlarms() {
  const existing = await getPrayerAlarms();
  for (const prayer of existing) {
    await cancelNativeAlarm(prayer.id);
  }
  await AsyncStorage.removeItem(PRAYER_ALARMS_KEY);
}

export async function getAlarms() {
  try {
    const data = await AsyncStorage.getItem(ALARMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export async function getPrayerAlarms() {
  try {
    const data = await AsyncStorage.getItem(PRAYER_ALARMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export async function deleteAlarm(id) {
  await Notifications.cancelScheduledNotificationAsync(id);
  await cancelNativeAlarm(id);
  const alarms = (await getAlarms()).filter((a) => a.id !== id);
  await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
  return alarms;
}

export async function toggleAlarm(id) {
  const alarms = await getAlarms();
  const alarm = alarms.find((a) => a.id === id);
  if (!alarm) return alarms;

  alarm.enabled = !alarm.enabled;

  if (alarm.enabled) {
    const { hour, minute, contentType } = alarm;
    await scheduleNativeAlarm(hour, minute, alarm.id, contentType, false);
  } else {
    await cancelNativeAlarm(alarm.id);
  }

  await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
  return alarms;
}

export async function cancelAllAlarms() {
  await AsyncStorage.removeItem(ALARMS_KEY);
  await AsyncStorage.removeItem(PRAYER_ALARMS_KEY);
}
