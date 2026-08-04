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
    const arr = raw ? JSON.parse(raw) : [];
    return arr.filter(i => i && typeof i === 'object');
  } catch { return []; }
}

export async function getFavIds() {
  try {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return arr
      .map(i => (typeof i === 'string' ? i : i && i.id))
      .filter(Boolean);
  } catch { return []; }
}

export async function toggleFavorite(item) {
  try {
    const id = typeof item === 'string' ? item : item && item.id;
    if (!id) return false;

    const raw = await AsyncStorage.getItem(FAV_KEY);
    let arr = raw ? JSON.parse(raw) : [];
    const exists = arr.some(i => (typeof i === 'string' ? i : i && i.id) === id);

    if (exists) {
      arr = arr.filter(i => (typeof i === 'string' ? i : i && i.id) !== id);
    } else {
      arr.push(item); // store the full item object
    }

    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(arr));
    return !exists;
  } catch { return false; }
}

// ---- session tracking ----
const SEEN = new Set();
export function markSeen(id) { SEEN.add(id); }
export function resetSeen() { SEEN.clear(); }

// ---- global verse cache ----
const CACHE = new Map();
export function getCachedVerse(id) { return CACHE.get(id) || null; }

// ---- per-category themed pools (keyword-matched quran verses) ----
// POOL[cat] = queue of unseen items; SEEN_CAT[cat] = ids already pooled
const POOL = Object.create(null);
const SEEN_CAT = Object.create(null);

function getCatState(cat) {
  if (!SEEN_CAT[cat]) { SEEN_CAT[cat] = new Set(); POOL[cat] = []; }
  return { seen: SEEN_CAT[cat], pool: POOL[cat] };
}

// ---- helpers ----
const MAX_QUOTE_LEN = 260;

function passLen(item) {
  return !!item && (item.quote || '').length <= MAX_QUOTE_LEN;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ============================================================
//  PROVIDER : QURAN  (api.alquran.cloud)
// ============================================================

const CAT_QUERIES = {
  pekerjaan: ['bekerja', 'rezeki', 'usaha', 'nafkah', 'amal', 'dagang'],
  keluarga: ['keluarga', 'nikah', 'suami', 'istri', 'anak', 'kasih'],
  umum: [],
  ibadah: ['shalat', 'puasa', 'zakat', 'dzikir', 'doa', 'taubat'],
};

function quranMatchToItem(match, cat, sub) {
  const { surah, numberInSurah, text } = match;
  const id = `q-${surah.number}-${numberInSurah}`;

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

async function quranSearch(query, cat, sub) {
  try {
    const resp = await fetch(
      `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/id.indonesian`
    );
    const json = await resp.json();
    if (json.code !== 200 || !json.data?.matches) return [];
    return json.data.matches
      .map(m => quranMatchToItem(m, cat, sub))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function quranRandom(cat) {
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

    const item = {
      id,
      cat: cat || 'umum',
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

// ============================================================
//  PROVIDER : HADITH  (hadis-api-id.vercel.app)
//  Indonesian hadith from 9 narrators — no API key needed
// ============================================================

const HADITH_NARRATORS = [
  { name: 'Abu Dawud', slug: 'abu-dawud', total: 4419 },
  { name: 'Ahmad', slug: 'ahmad', total: 4305 },
  { name: 'Bukhari', slug: 'bukhari', total: 6638 },
  { name: 'Darimi', slug: 'darimi', total: 2949 },
  { name: 'Ibnu Majah', slug: 'ibnu-majah', total: 4285 },
  { name: 'Malik', slug: 'malik', total: 1587 },
  { name: 'Muslim', slug: 'muslim', total: 4930 },
  { name: 'Nasai', slug: 'nasai', total: 5364 },
  { name: 'Tirmidzi', slug: 'tirmidzi', total: 3625 },
];

async function hadithRandom(cat) {
  const narrator = HADITH_NARRATORS[Math.floor(Math.random() * HADITH_NARRATORS.length)];
  const number = Math.floor(Math.random() * narrator.total) + 1;
  const id = `h-${narrator.slug}-${number}`;

  try {
    const resp = await fetch(
      `https://hadis-api-id.vercel.app/hadith/${narrator.slug}/${number}`
    );
    const json = await resp.json();
    if (!json || !json.id) return null;

    const item = {
      id,
      cat: cat || 'umum',
      sub: `Riwayat ${narrator.name}`,
      title: `HR. ${narrator.name} : ${number}`,
      quote: json.id,
      source: `Hadits Riwayat ${narrator.name} : ${number}`,
    };
    CACHE.set(id, item);
    return item;
  } catch {
    return null;
  }
}

// ============================================================
//  PROVIDER : QUOTE  (zenquotes.io — general wisdom)
// ============================================================

async function quoteRandom(cat) {
  try {
    const resp = await fetch('https://zenquotes.io/api/random');
    const json = await resp.json();
    if (!json || !json[0]) return null;
    const { q, a } = json[0];
    const id = `t-${simpleHash(q + a)}`;

    const item = {
      id,
      cat: cat || 'umum',
      sub: 'kata bijak',
      title: a,
      quote: q,
      source: `— ${a}`,
    };
    CACHE.set(id, item);
    return item;
  } catch {
    return null;
  }
}

// ============================================================
//  PROVIDER ORDER per category
// ============================================================

const PROVIDER_ORDER = {
  pekerjaan: ['quran_search', 'hadith'],
  keluarga: ['quran_search', 'hadith'],
  ibadah: ['quran_search', 'hadith'],
  umum: ['quran_random', 'hadith', 'quote'],
};

// ============================================================
//  PUBLIC API — used by MotivationScreen
// ============================================================

/// refill the themed pool with fresh keyword-matched quran verses
async function refillSearchPool(cat) {
  const queries = CAT_QUERIES[cat] || [];
  if (queries.length === 0) return;

  const { seen, pool } = getCatState(cat);

  const results = await Promise.all(
    queries.map(q => quranSearch(q, cat, q))
  );
  const fresh = shuffle(results.flat()).filter(
    i => i && !seen.has(i.id) && passLen(i)
  );

  for (const item of fresh) {
    seen.add(item.id);
    pool.push(item);
  }
  shuffle(pool);
}

/// initial batch for a category
export async function fetchBatch(cat, count = 6) {
  const queries = CAT_QUERIES[cat] || [];

  if (queries.length > 0) {
    // themed keyword-matched verses, paginated from a per-category pool
    const { pool } = getCatState(cat);

    if (pool.length < count) await refillSearchPool(cat);

    // once the themed pool is exhausted, top up with generic
    // religious content so infinite scroll never dies
    if (pool.length < count) {
      const needed = count - pool.length;
      const tasks = [];
      for (let i = 0; i < needed * 3; i++) tasks.push(hadithRandom(cat));
      for (let i = 0; i < needed * 2; i++) tasks.push(quranRandom(cat));
      const extras = (await Promise.all(tasks)).filter(Boolean).filter(passLen);
      pool.push(...shuffle(extras));
    }

    const out = pool.splice(0, count);
    out.sort((a, b) => (a.quote || '').length - (b.quote || '').length);
    return out;
  }

  // umum: mix all three providers
  const tasks = [];
  for (let i = 0; i < count * 2; i++) tasks.push(quranRandom('umum'));
  for (let i = 0; i < count; i++) tasks.push(hadithRandom('umum'));
  for (let i = 0; i < count; i++) tasks.push(quoteRandom('umum'));

  const completed = (await Promise.all(tasks)).filter(Boolean).filter(passLen);
  completed.sort((a, b) => (a.quote || '').length - (b.quote || '').length);
  return shuffle(completed).slice(0, count);
}

/// load one more item for infinite scroll
export async function fetchOne(cat) {
  // 1) check cache for unseen items in this category
  for (const [, item] of CACHE) {
    if (item.cat === cat && !SEEN.has(item.id)) return item;
  }

  // 2) try providers in order
  const order = PROVIDER_ORDER[cat] || ['quran_random', 'hadith'];

  for (const provider of order) {
    let item = null;
    switch (provider) {
      case 'quran_search': {
        const queries = CAT_QUERIES[cat] || [];
        if (queries.length > 0) {
          const q = queries[Math.floor(Math.random() * queries.length)];
          const items = await quranSearch(q, cat, q);
          const unseen = items.filter(i => !SEEN.has(i.id));
          if (unseen.length > 0) item = unseen[0];
        }
        break;
      }
      case 'quran_random':
        item = await quranRandom(cat);
        break;
      case 'hadith':
        item = await hadithRandom(cat);
        break;
      case 'quote':
        item = await quoteRandom(cat);
        break;
    }
    if (item) return item;
  }

  // 3) last resort: random quran verse with any cat
  return quranRandom('umum');
}
