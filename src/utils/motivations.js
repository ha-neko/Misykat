import AsyncStorage from '@react-native-async-storage/async-storage';

const FAV_KEY = 'motivation_favorites';

// ---- category labels ----
export function getCategories() {
  return ['pekerjaan', 'keluarga', 'umum', 'ibadah'];
}

export function getCategoryLabel(cat) {
  const labels = { pekerjaan: 'Pekerjaan', keluarga: 'Keluarga', umum: 'Umum', ibadah: 'Ibadah', _fav: 'Favorit' };
  return labels[cat] || cat;
}

// ---- favorites (persisted) ----
export async function getFavorites() {
  try {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function getFavIds() {
  try {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function toggleFavorite(id) {
  try {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    let ids = raw ? JSON.parse(raw) : [];
    if (ids.includes(id)) {
      ids = ids.filter(i => i !== id);
    } else {
      ids.push(id);
    }
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(ids));
    return ids.includes(id);
  } catch { return false; }
}

// ---- session-level seen tracking ----
const SEEN = new Set();

export function markSeen(id) { SEEN.add(id); }
export function resetSeen() { SEEN.clear(); }

// ---- category search queries ----
const CATEGORY_QUERIES = {
  pekerjaan: ['bekerja', 'rezeki', 'usaha', 'nafkah'],
  keluarga: ['keluarga', 'nikah', 'suami', 'istri', 'anak'],
  umum: [],
  ibadah: ['shalat', 'puasa', 'zakat', 'ibadah', 'dzikir'],
};

// extra queries to refresh the pool when running low
const EXTRA_QUERIES = {
  pekerjaan: ['amal', 'karyawan', 'upah', 'dagang'],
  keluarga: ['rumah', 'sayang', 'kasih', 'ortu', 'bapak'],
  ibadah: ['taubat', 'doa', 'sedekah', 'haji', 'quran'],
  umum: [],
};

// per-category pool of fetched verse items (id -> item)
const POOLS = {};
for (const cat of ['pekerjaan', 'keluarga', 'umum', 'ibadah']) {
  POOLS[cat] = new Map();
}

// track which queries we've already fetched for each category
const FETCHED_QUERIES = {};
for (const cat of ['pekerjaan', 'keluarga', 'umum', 'ibadah']) {
  FETCHED_QUERIES[cat] = new Set();
}

// global verse cache for favorites recall
const VERSE_CACHE = new Map();

export function getCachedVerse(id) {
  return VERSE_CACHE.get(id) || null;
}

function buildItem(arabic, indo, cat, sub) {
  const { surah, numberInSurah } = arabic;
  const id = `q-${surah.number}-${numberInSurah}`;
  if (VERSE_CACHE.has(id)) return null; // already cached = duplicate

  const item = {
    id,
    cat,
    sub: sub || 'quran',
    title: `QS. ${surah.englishName} : ${numberInSurah}`,
    quote: (indo && indo.text) || arabic.text,
    source: `QS. ${surah.englishName} : ${numberInSurah}`,
    content: null,
  };

  VERSE_CACHE.set(id, item);
  return item;
}

async function searchVerses(query, cat, sub) {
  try {
    const resp = await fetch(
      `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/id.indonesian`
    );
    const json = await resp.json();
    if (json.code !== 200 || !json.data || !json.data.matches) return;

    for (const match of json.data.matches) {
      // we need the arabic edition for surah info; we only have indo here
      const { surah, numberInSurah, text } = match;
      const id = `q-${surah.number}-${numberInSurah}`;
      if (VERSE_CACHE.has(id)) continue;

      // fetch arabic for this specific ayah to get proper surah name
      try {
        const arResp = await fetch(
          `https://api.alquran.cloud/v1/ayah/${surah.number}:${numberInSurah}/quran-uthmani`
        );
        const arJson = await arResp.json();
        if (arJson.code === 200 && arJson.data) {
          const item = buildItem(arJson.data, { text }, cat, sub);
          if (item) POOLS[cat].set(item.id, item);
        }
      } catch {
        // fallback: use match data directly
        const item = {
          id,
          cat,
          sub: sub || 'quran',
          title: `QS. ${surah.englishName} : ${numberInSurah}`,
          quote: text,
          source: `QS. ${surah.englishName} : ${numberInSurah}`,
          content: null,
        };
        VERSE_CACHE.set(id, item);
        POOLS[cat].set(id, item);
      }
    }
  } catch { /* ignore */ }
}

async function seedCategory(cat) {
  const queries = CATEGORY_QUERIES[cat] || [];
  const promises = queries.map(q => {
    if (FETCHED_QUERIES[cat].has(q)) return Promise.resolve();
    FETCHED_QUERIES[cat].add(q);
    return searchVerses(q, cat, cat === 'umum' ? 'kehidupan' : q);
  });
  await Promise.all(promises);
}

async function refreshCategory(cat) {
  const extra = EXTRA_QUERIES[cat] || [];
  const promises = extra.map(q => {
    if (FETCHED_QUERIES[cat].has(q)) return Promise.resolve();
    FETCHED_QUERIES[cat].add(q);
    return searchVerses(q, cat, cat === 'umum' ? 'kehidupan' : q);
  });
  await Promise.all(promises);
}

// ---- public API ----

export async function fetchBatch(cat, count = 6) {
  if (!POOLS[cat]) return [];

  // ensure pool is seeded
  await seedCategory(cat);

  // pick unseen items from pool
  const pool = POOLS[cat];
  const available = [];
  for (const [id, item] of pool) {
    if (!SEEN.has(id) && available.length < count) available.push(item);
  }

  // if not enough, try refreshing
  if (available.length < count) {
    await refreshCategory(cat);
    for (const [id, item] of pool) {
      if (!SEEN.has(id) && !available.find(i => i.id === id) && available.length < count) {
        available.push(item);
      }
    }
  }

  // if still not enough, fetch random verses (general)
  if (available.length < count) {
    const fallback = await fetchGeneralVerses(count - available.length);
    available.push(...fallback);
  }

  return available.slice(0, count);
}

export async function fetchOne(cat) {
  if (!POOLS[cat]) return null;

  await seedCategory(cat);

  const pool = POOLS[cat];
  for (const [id, item] of pool) {
    if (!SEEN.has(id)) return item;
  }

  // refresh and try again
  await refreshCategory(cat);
  for (const [id, item] of pool) {
    if (!SEEN.has(id)) return item;
  }

  // fallback to general
  return fetchGeneralVerse();
}

async function fetchGeneralVerses(count = 1) {
  const results = [];
  const promises = [];
  for (let i = 0; i < count * 3; i++) {
    promises.push(fetchGeneralVerse());
  }
  const all = await Promise.all(promises);
  for (const v of all) {
    if (v && results.length < count) results.push(v);
  }
  return results;
}

async function fetchGeneralVerse() {
  try {
    const resp = await fetch(
      'https://api.alquran.cloud/v1/ayah/random/editions/quran-uthmani,id.indonesian'
    );
    const json = await resp.json();
    if (json.code !== 200 || !json.data) return null;
    const arabic = json.data[0];
    const indo = json.data[1] || arabic;
    const { surah, numberInSurah } = arabic;
    const id = `q-${surah.number}-${numberInSurah}`;
    if (VERSE_CACHE.has(id)) return null;
    return buildItem(arabic, indo, 'umum', 'kehidupan');
  } catch {
    return null;
  }
}
