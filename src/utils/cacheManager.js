import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = FileSystem.documentDirectory + 'audio_cache/';
const MAX_ITEMS = 100;
const CACHE_INDEX_KEY = 'audio_cache_index';

async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function getCacheIndex() {
  try {
    const data = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveCacheIndex(index) {
  await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      resolve(data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function evictIfNeeded() {
  const index = await getCacheIndex();
  if (index.length < MAX_ITEMS) return;

  index.sort((a, b) => a.lastUsed - b.lastUsed);
  const toDelete = index.slice(0, index.length - Math.floor(MAX_ITEMS * 0.7));

  for (const entry of toDelete) {
    try {
      await FileSystem.deleteAsync(CACHE_DIR + entry.key + '.mp3', { idempotent: true });
    } catch {}
  }

  const remaining = index.slice(toDelete.length);
  await saveCacheIndex(remaining);
}

async function downloadWithFetch(url, localPath) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const base64 = await blobToBase64(blob);
  await FileSystem.writeAsStringAsync(localPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return localPath;
}

export async function getCachedAudio(cacheKey, url) {
  await ensureCacheDir();
  const localPath = CACHE_DIR + cacheKey + '.mp3';

  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) {
    const index = await getCacheIndex();
    const entry = index.find((e) => e.key === cacheKey);
    if (entry) entry.lastUsed = Date.now();
    await saveCacheIndex(index);
    return { uri: localPath, fromCache: true };
  }

  try {
    await FileSystem.downloadAsync(url, localPath);
  } catch {
    try {
      await downloadWithFetch(url, localPath);
    } catch {
      throw new Error('Download failed');
    }
  }

  const index = await getCacheIndex();
  index.push({ key: cacheKey, lastUsed: Date.now() });
  await saveCacheIndex(index);

  evictIfNeeded();

  return { uri: localPath, fromCache: false };
}

export async function getCacheSize() {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) return 0;
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let total = 0;
    for (const f of files) {
      try {
        const fi = await FileSystem.getInfoAsync(CACHE_DIR + f);
        if (fi.exists && fi.size) total += fi.size;
      } catch {}
    }
    return total;
  } catch {
    return 0;
  }
}

export async function clearAudioCache() {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    await AsyncStorage.removeItem(CACHE_INDEX_KEY);
  } catch {}
}
