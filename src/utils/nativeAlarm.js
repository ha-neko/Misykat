import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const Native = NativeModules.MisykatAlarmModule;

export async function scheduleNativeAlarm(hour, minute, alarmId, contentType, isPrayer = false) {
  if (Platform.OS !== 'android' || !Native) {
    return;
  }
  try {
    return await Native.scheduleAlarm(hour, minute, alarmId, contentType || '', isPrayer);
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
