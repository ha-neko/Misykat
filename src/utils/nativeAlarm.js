import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

const Native = requireOptionalNativeModule('MisykatAlarm');

export async function scheduleNativeAlarm(hour, minute, alarmId, contentType, isPrayer = false) {
  if (Platform.OS !== 'android' || !Native) return;
  try {
    const now = new Date();
    const triggerTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
    if (triggerTime.getTime() <= Date.now()) {
      triggerTime.setDate(triggerTime.getDate() + 1);
    }
    return await Native.scheduleAlarm(alarmId, triggerTime.getTime(), contentType || '', isPrayer);
  } catch (e) {
    console.warn('Native alarm scheduling failed:', e.message);
  }
}

export async function cancelNativeAlarm(alarmId) {
  if (Platform.OS !== 'android' || !Native) return;
  try {
    return await Native.cancelAlarm(alarmId);
  } catch (e) {
    console.warn('Native alarm cancel failed:', e.message);
  }
}

export async function getInitialAlarmData() {
  if (Platform.OS !== 'android' || !Native) {
    return { fromAlarm: false, alarmId: '', contentType: '', isPrayer: false };
  }
  try {
    return await Native.getInitialAlarmData();
  } catch {
    return { fromAlarm: false, alarmId: '', contentType: '', isPrayer: false };
  }
}

export function isNativeAlarmAvailable() {
  return Platform.OS === 'android' && !!Native;
}
