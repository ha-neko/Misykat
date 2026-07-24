import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const MAX_ERRORS = 50;
const STORAGE_KEY = 'misykat_error_log';

let errors = [];

// ---- persistence ----
async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
  } catch { /* best effort */ }
}

export async function loadErrors() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) errors = JSON.parse(raw);
  } catch { /* best effort */ }
}

// ---- capture ----
export function captureError(error, context = '') {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    message: error?.message || String(error),
    stack: error?.stack || '',
    context,
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
    appVersion: '1.0.0',
  };

  errors = [entry, ...errors].slice(0, MAX_ERRORS);
  persist();

  return entry;
}

// ---- read / clear ----
export function getErrors() {
  return [...errors];
}

export async function clearErrors() {
  errors = [];
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch { /* best effort */ }
}

// ---- formatted report ----
export function formatReport() {
  if (errors.length === 0) return 'No errors logged.';

  const lines = errors.map((e, i) => {
    const time = new Date(e.timestamp).toLocaleString();
    return [
      `[${i + 1}] ${time}`,
      `  Context : ${e.context || '—'}`,
      `  Message : ${e.message}`,
      `  Platform: ${e.platform}`,
      `  Stack   : ${e.stack || '—'}`,
    ].join('\n');
  });

  return lines.join('\n\n---\n\n');
}
