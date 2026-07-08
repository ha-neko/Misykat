const reciters = [
  { id: 'afs', name: 'Mishary Al-Afasy' },
  { id: 'abdulbasit', name: 'Abdul Basit' },
  { id: 'ahmedajamy', name: 'Ahmed Ajamy' },
  { id: 'saadghamidi', name: 'Saad Al-Ghamidi' },
  { id: 'hudhaify', name: 'Hudhaify' },
  { id: 'sudais', name: 'Abdurrahman As-Sudais' },
  { id: 'hani', name: 'Hani Ar-Rifai' },
  { id: 'jbrl', name: 'Jibreel' },
  { id: 'm_qari', name: 'Muhammad Al-Qari' },
  { id: 'mtrod', name: 'Mukhtar At-Tarid' },
  { id: 'minshawi', name: 'Al-Minshawi' },
  { id: 'husary', name: 'Mahmoud Al-Husary' },
];

const surahNums = {
  'Al-Falaq': 113, 'An-Nas': 114, 'Al-Ikhlas': 112, 'Al-Asr': 103,
  'Al-Insyirah': 94, 'Ad-Dhuha': 93, 'Al-Kahfi': 18, 'Al-Baqarah': 2,
  'Yasin': 36, 'Ar-Rahman': 55, 'Al-Mulk': 67, 'Al-Fatihah': 1,
  'Al-Waqiah': 56, 'Al-Insan': 76, 'Al-Jumuah': 62, 'Al-Hadid': 57,
  'Al-Hashr': 59, 'As-Saff': 61, 'At-Taghabun': 64, 'Nuh': 71,
  'Al-Jinn': 72, 'Al-Muzzammil': 73, 'Al-Muddaththir': 74,
  'Al-Qiyamah': 75, 'Abasa': 80, 'At-Takwir': 81, 'Al-Infitar': 82,
  'Al-Inshiqaq': 84, 'Al-Buruj': 85, 'At-Tariq': 86, 'Al-Ala': 87,
  'Al-Ghashiyah': 88, 'Al-Fajr': 89, 'Al-Balad': 90, 'Ash-Shams': 91,
  'Al-Layl': 92, 'At-Tin': 95, 'Al-Alaq': 96, 'Al-Qadr': 97,
  'Al-Bayyinah': 98, 'Az-Zalzalah': 99, 'Al-Adiyat': 100, 'Al-Qariah': 101,
  'At-Takathur': 102, 'Al-Humazah': 104, 'Al-Fil': 105, 'Quraish': 106,
  'Al-Maun': 107, 'Al-Kawthar': 108, 'Al-Kafirun': 109, 'An-Nasr': 110,
  'Al-Masad': 111,
};

const adhanList = [
  { name: 'Adhan - Mishary Al-Afasy', url: 'https://www.islamcan.com/audio/adhan/azan1.mp3' },
  { name: 'Adhan - Mekkah', url: 'https://www.islamcan.com/audio/adhan/azan2.mp3' },
  { name: 'Adhan - Abdul Basit', url: 'https://download.quranicaudio.com/quran/adhan/abdul_basit_abdus_samad/adhan.mp3' },
  { name: 'Adhan - Madinah', url: 'https://www.islamcan.com/audio/adhan/azan3.mp3' },
  { name: 'Adhan - Mesir', url: 'https://www.islamcan.com/audio/adhan/azan4.mp3' },
];

const rodjaDzikirPagi = {
  url: 'https://mp3.radiorodja.com/Doa%20dan%20Dzikir/Dzikir%20dan%20Doa%20-%20Dzikir%20Pagi%20dan%20Petang-%20Dzikir%20Pagi.mp3',
  name: 'Dzikir Pagi - Radio Rodja',
  cacheKey: 'dzikir_pagi_rodja',
};

const tvquranAthkar = [
  {
    url: 'https://download.tvquran.com/download/TvQuran.com__Athkar/TvQuran.com_athkar_01.mp3',
    name: 'Morning Adhkar - Al-Afasy',
    cacheKey: 'athkar_afasy_01',
  },
  {
    url: 'https://download.tvquran.com/download/TvQuran.com__Athkar/TvQuran.com_athkar_03.mp3',
    name: 'Evening Adhkar - Al-Afasy',
    cacheKey: 'athkar_afasy_03',
  },
];

const rodjaKajian = [
  {
    url: 'https://mp3.radiorodja.com/Ustadz%20Abu%20Qatadah/Tematik/20201124%20-%20Ustadz%20Abu%20Qatadah%20-%20Tematik%20-%205%20Nasihat%20dalam%20Menghadapi%20Ujian%20dan%20Fitnah.mp3',
    name: '5 Nasihat dalam Menghadapi Ujian - Ustadz Abu Qatadah',
    cacheKey: 'rodja_kajian_abuq_01',
  },
  {
    url: 'https://mp3.radiorodja.com/Ustadz%20Abu%20Qatadah/Tematik/20201208%20-%20Ustadz%20Abu%20Qatadah%20-%20Tematik%20-%20Musibah%20Terbesar%20yang%20Menimpa%20Orang%20Beriman.mp3',
    name: 'Musibah Terbesar - Ustadz Abu Qatadah',
    cacheKey: 'rodja_kajian_abuq_02',
  },
  {
    url: 'https://mp3.radiorodja.com/Ustadz%20Abu%20Qatadah/Tematik/20210126%20-%20Ustadz%20Abu%20Qatadah%20-%20Tematik%20-%20Shirathal%20Mustaqim.mp3',
    name: 'Shirathal Mustaqim - Ustadz Abu Qatadah',
    cacheKey: 'rodja_kajian_abuq_03',
  },
  {
    url: 'https://mp3.radiorodja.com/Ustadz%20Abu%20Qatadah/Tematik/20210210%20-%20Ustadz%20Abu%20Qatadah%20-%20Tematik%20-%20Penjelasan%20Tauhid%20dan%20Bantahan%20Kepada%20Kaum%20Jahmiyah.mp3',
    name: 'Penjelasan Tauhid - Ustadz Abu Qatadah',
    cacheKey: 'rodja_kajian_abuq_04',
  },
  {
    url: 'https://mp3.radiorodja.com/Ustadz%20Abu%20Yala%20Kurnaedi/Al%20Burhan%20Min%20Qashashil%20Quran/20260127%20Ustadz%20Abu%20Yala%20Kurnaedi%20-%20Al%20Burhan%20Min%20Qashashil%20Quran%20-%20Pelajaran%20dari%20Dakwah%20Nabi%20Nuh.mp3',
    name: 'Pelajaran dari Dakwah Nabi Nuh - Ustadz Abu Yala Kurnaedi',
    cacheKey: 'rodja_kajian_ayk_02',
  },
  {
    url: 'https://mp3.radiorodja.com/Ustadz%20Abu%20Yala%20Kurnaedi/Al%20Burhan%20Min%20Qashashil%20Quran/20260622%20Ustadz%20Abu%20Yala%20Kurnaedi%20-%20Al%20Burhan%20Min%20Qashashil%20Quran%20-%20Meninggalkan%20Sesuatu%20Karena%20Allah.mp3',
    name: 'Meninggalkan Sesuatu Karena Allah - Ustadz Abu Yala Kurnaedi',
    cacheKey: 'rodja_kajian_ayk_05',
  },
];

function quranURL(surahNum) {
  const r = reciters[Math.floor(Math.random() * reciters.length)];
  const num = String(surahNum).padStart(3, '0');
  return {
    url: `https://server8.mp3quran.net/${r.id}/${num}.mp3`,
    name: `${r.name}`,
    cacheKey: `quran_${r.id}_${num}`,
  };
}

const themePools = {
  morning: [
    { surah: 93, name: 'Ad-Dhuha' },
    { surah: 91, name: 'Ash-Shams' },
    { surah: 92, name: 'Al-Layl' },
    { surah: 113, name: 'Al-Falaq' },
    { surah: 94, name: 'Al-Insyirah' },
  ],
  fajr: [
    { surah: 89, name: 'Al-Fajr' },
    { surah: 103, name: 'Al-Asr' },
    { surah: 76, name: 'Al-Insan' },
  ],
  dzikir: [
    { surah: 113, name: 'Al-Falaq' },
    { surah: 114, name: 'An-Nas' },
    { surah: 112, name: 'Al-Ikhlas' },
    rodjaDzikirPagi,
    ...tvquranAthkar,
  ],
  protection: [
    { surah: 113, name: 'Al-Falaq' },
    { surah: 114, name: 'An-Nas' },
    { surah: 1, name: 'Al-Fatihah' },
  ],
  blessing: [
    { surah: 55, name: 'Ar-Rahman' },
    { surah: 56, name: 'Al-Waqiah' },
    { surah: 67, name: 'Al-Mulk' },
    { surah: 36, name: 'Yasin' },
  ],
  strength: [
    { surah: 67, name: 'Al-Mulk' },
    { surah: 57, name: 'Al-Hadid' },
    { surah: 1, name: 'Al-Fatihah' },
    { surah: 112, name: 'Al-Ikhlas' },
  ],
  ease: [
    { surah: 94, name: 'Al-Insyirah' },
    { surah: 95, name: 'At-Tin' },
    { surah: 93, name: 'Ad-Dhuha' },
  ],
  time: [
    { surah: 103, name: 'Al-Asr' },
    { surah: 76, name: 'Al-Insan' },
    { surah: 75, name: 'Al-Qiyamah' },
  ],
  sincerity: [
    { surah: 112, name: 'Al-Ikhlas' },
    { surah: 109, name: 'Al-Kafirun' },
    { surah: 1, name: 'Al-Fatihah' },
  ],
  general: [
    { surah: 1, name: 'Al-Fatihah' },
    { surah: 112, name: 'Al-Ikhlas' },
    { surah: 114, name: 'An-Nas' },
    { surah: 113, name: 'Al-Falaq' },
  ],
};

const ceramahPools = {
  morning: [
    rodjaDzikirPagi,
    ...tvquranAthkar,
    rodjaKajian[0],
    rodjaKajian[1],
  ],
  fajr: [
    rodjaDzikirPagi,
    ...tvquranAthkar,
  ],
  dzikir: [
    rodjaDzikirPagi,
    ...tvquranAthkar,
  ],
  protection: [
    ...tvquranAthkar,
    rodjaKajian[3],
  ],
  blessing: [
    rodjaKajian[0],
    rodjaKajian[4],
    ...tvquranAthkar,
  ],
  strength: [
    rodjaKajian[0],
    rodjaKajian[1],
    rodjaKajian[5],
  ],
  ease: [
    rodjaDzikirPagi,
    rodjaKajian[0],
  ],
  time: [
    rodjaKajian[2],
    rodjaKajian[4],
  ],
  sincerity: [
    rodjaKajian[3],
    rodjaKajian[5],
    ...tvquranAthkar,
  ],
  general: [
    ...rodjaKajian,
    rodjaDzikirPagi,
    ...tvquranAthkar,
  ],
};

function detectTheme(content) {
  const t = (content.title + ' ' + (content.explanation || '') + ' ' + (content.topic || '')).toLowerCase();

  if (/subuh|fajr|sholat|tahajud|qiyamul/i.test(t)) return 'fajr';
  if (/doa|dzikir|berdoa|istigfar/i.test(t)) return 'dzikir';
  if (/lindung|setan|jahat|audzu|nafs/i.test(t)) return 'protection';
  if (/berkah|rezeki|nikmat|syukur|pemberian/i.test(t)) return 'blessing';
  if (/kuat|iman|takwa|mukmin|istiqomah/i.test(t)) return 'strength';
  if (/mudah|semangat|ringan|giat/i.test(t)) return 'ease';
  if (/waktu|pagi|bangun|hari|pagi|fajar|dhuha/i.test(t)) return 'morning';
  if (/ikhlas|niat|murni/i.test(t)) return 'sincerity';

  return 'general';
}

function pickFromPool(pool) {
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (pick.url) {
    return {
      url: pick.url,
      name: pick.name,
      cacheKey: pick.cacheKey,
    };
  }
  const a = quranURL(pick.surah);
  return {
    url: a.url,
    name: `${a.name} - ${pick.name}`,
    cacheKey: a.cacheKey,
  };
}

export function getAudioForContent(content, isPrayer = false) {
  if (isPrayer) {
    const a = adhanList[Math.floor(Math.random() * adhanList.length)];
    return {
      type: 'stream',
      url: a.url,
      cacheKey: `adhan_${Math.random().toString(36).slice(2, 8)}`,
      name: a.name,
      fallback: { text: 'Allahu Akbar, Allahu Akbar', lang: 'ar' },
    };
  }

  if (!content) return null;

  if (content.type === 'Surah') {
    const surahName = content.surah || '';
    let num = surahNums[surahName];
    if (!num) {
      const found = Object.entries(surahNums).find(([k]) =>
        content.title?.includes(k) || k.includes(content.title || '')
      );
      num = found ? found[1] : 1;
    }
    const a = quranURL(num);
    return {
      type: 'stream',
      url: a.url,
      cacheKey: a.cacheKey,
      name: `${a.name} - ${surahName}`,
      fallback: { text: `${content.title}. ${content.translation}`, lang: 'id' },
    };
  }

  if (content.type === 'Ceramah') {
    const theme = detectTheme(content);
    const pool = ceramahPools[theme] || ceramahPools.general;
    const audio = pool[Math.floor(Math.random() * pool.length)];
    return {
      type: 'stream',
      url: audio.url,
      cacheKey: audio.cacheKey,
      name: audio.name,
      fallback: { text: content.topic || content.title, lang: 'id' },
    };
  }

  const theme = detectTheme(content);
  const pool = themePools[theme] || themePools.general;
  const audio = pickFromPool(pool);

  const fallbackText = content.translation || content.explanation || content.topic || content.title;
  return {
    type: 'stream',
    url: audio.url,
    cacheKey: audio.cacheKey,
    name: audio.name,
    fallback: { text: fallbackText, lang: 'id' },
  };
}

export function getPrayerAdhan() {
  const a = adhanList[Math.floor(Math.random() * adhanList.length)];
  return {
    type: 'stream',
    url: a.url,
    cacheKey: `adhan_${Math.random().toString(36).slice(2, 8)}`,
    name: a.name,
    fallback: { text: 'Allahu Akbar, Allahu Akbar', lang: 'ar' },
  };
}
