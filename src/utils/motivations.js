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

// ---- global verse cache + dedup set ----
const CACHE = new Map();
export function getCachedVerse(id) { return CACHE.get(id) || null; }
const ID_CACHE = new Set();

// ---- helpers ----
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
    if (ID_CACHE.has(id)) return null;
    ID_CACHE.add(id);

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

  if (ID_CACHE.has(id)) return null;
  ID_CACHE.add(id);

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

    if (ID_CACHE.has(id)) return null;
    ID_CACHE.add(id);

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

/// initial batch for a category
export async function fetchBatch(cat, count = 6) {
  const queries = CAT_QUERIES[cat] || [];

  if (queries.length > 0) {
    // 1) quran keyword searches
    const results = await Promise.all(
      queries.map(q => quranSearch(q, cat, q))
    );
    let flat = shuffle(results.flat());

    // 2) top up with hadith if still short
    if (flat.length < count) {
      const needed = count - flat.length;
      const promises = [];
      for (let i = 0; i < needed * 3; i++) promises.push(hadithRandom(cat));
      const hadith = (await Promise.all(promises)).filter(Boolean);
      flat = shuffle([...flat, ...hadith]);
    }

    return flat.slice(0, count);
  }

  // umum: mix all three providers
  const all = [];
  const tasks = [];
  for (let i = 0; i < count * 2; i++) tasks.push(quranRandom('umum'));
  for (let i = 0; i < count; i++) tasks.push(hadithRandom('umum'));
  for (let i = 0; i < count; i++) tasks.push(quoteRandom('umum'));

  const completed = (await Promise.all(tasks)).filter(Boolean);
  all.push(...completed);

  return shuffle(all).slice(0, count);
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
