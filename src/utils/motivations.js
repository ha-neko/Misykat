import AsyncStorage from '@react-native-async-storage/async-storage';

const FAV_KEY = 'motivation_favorites';

export function getCategories() {
  return ['pekerjaan', 'keluarga', 'umum', 'ibadah'];
}

export function getCategoryLabel(cat) {
  const labels = { pekerjaan: 'Pekerjaan', keluarga: 'Keluarga', umum: 'Umum', ibadah: 'Ibadah', _fav: 'Favorit' };
  return labels[cat] || cat;
}

// ---- favorites ----
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
    if (ids.includes(id)) ids = ids.filter(i => i !== id);
    else ids.push(id);
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(ids));
    return ids.includes(id);
  } catch { return false; }
}

// ---- session tracking ----
const SEEN = new Set();
export function markSeen(id) { SEEN.add(id); }
export function resetSeen() { SEEN.clear(); }

// ---- verse cache (for favorites recall) ----
const CACHE = new Map();
export function getCachedVerse(id) { return CACHE.get(id) || null; }

const ID_CACHE = new Set(); // dedup across all fetches

const CAT_QUERIES = {
  pekerjaan: ['bekerja', 'rezeki', 'usaha', 'nafkah', 'amal', 'dagang'],
  keluarga: ['keluarga', 'nikah', 'suami', 'istri', 'anak', 'kasih'],
  umum: [],
  ibadah: ['shalat', 'puasa', 'zakat', 'dzikir', 'doa', 'taubat'],
};

// ---- build item from search match (no extra API call needed) ----
function matchToItem(match, cat, sub) {
  const { surah, numberInSurah, text } = match;
  const id = `q-${surah.number}-${numberInSurah}`;
  if (ID_CACHE.has(id)) return null;
  ID_CACHE.add(id);

  const item = {
    id,
    cat,
    sub: sub || 'quran',
    title: `${surah.englishName} : ${numberInSurah}`,
    quote: text,
    source: `QS. ${surah.englishName} : ${numberInSurah}`,
  };
  CACHE.set(id, item);
  return item;
}

// ---- fetch one page of search results and convert ----
async function searchAndCollect(query, cat, sub) {
  try {
    const resp = await fetch(
      `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/id.indonesian`
    );
    const json = await resp.json();
    if (json.code !== 200 || !json.data?.matches) return [];
    return json.data.matches
      .map(m => matchToItem(m, cat, sub))
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ---- public API ----

// initial batch: search each keyword, collect unique items
export async function fetchBatch(cat, count = 6) {
  const queries = CAT_QUERIES[cat] || [];
  if (queries.length === 0) {
    // umum: use random endpoint instead
    return fetchRandomBatch(count);
  }

  // fire all searches concurrently
  const results = await Promise.all(
    queries.map(q => searchAndCollect(q, cat, q))
  );
  const flat = results.flat();

  // shuffle and take what we need
  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flat[i], flat[j]] = [flat[j], flat[i]];
  }
  return flat.slice(0, count);
}

// loadMore: pick one unseen item from cache, else fetch a random search
export async function fetchOne(cat) {
  // try cache first
  for (const [, item] of CACHE) {
    if (item.cat === cat && !SEEN.has(item.id)) return item;
  }

  // fetch a fresh search
  const queries = CAT_QUERIES[cat] || [];
  if (queries.length > 0) {
    const q = queries[Math.floor(Math.random() * queries.length)];
    const items = await searchAndCollect(q, cat, q);
    const unseen = items.filter(i => !SEEN.has(i.id));
    if (unseen.length > 0) return unseen[0];
  }

  // fallback: random verse
  return fetchRandomVerse();
}

// ---- random verse (fallback + umum category) ----
async function fetchRandomVerse() {
  try {
    const resp = await fetch(
      'https://api.alquran.cloud/v1/ayah/random/editions/quran-uthmani,id.indonesian'
    );
    const json = await resp.json();
    if (json.code !== 200 || !json.data) return null;
    const [arabic, indo] = json.data;
    if (!arabic) return null;
    const { surah, numberInSurah } = arabic;
    const id = `q-${surah.number}-${numberInSurah}`;
    if (ID_CACHE.has(id)) return null;
    ID_CACHE.add(id);

    const item = {
      id,
      cat: 'umum',
      sub: 'kehidupan',
      title: `${surah.englishName} : ${numberInSurah}`,
      quote: (indo && indo.text) || arabic.text,
      source: `QS. ${surah.englishName} : ${numberInSurah}`,
    };
    CACHE.set(id, item);
    return item;
  } catch {
    return null;
  }
}

async function fetchRandomBatch(count) {
  const results = [];
  const promises = [];
  for (let i = 0; i < count * 3; i++) promises.push(fetchRandomVerse());
  const all = await Promise.all(promises);
  for (const v of all) {
    if (v && results.length < count) results.push(v);
  }
  return results;
}
