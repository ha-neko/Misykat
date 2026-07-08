import AsyncStorage from '@react-native-async-storage/async-storage';
import { wakeUpHadith, wakeUpSurah, wakeUpCeramah } from '../data/islamicContent';

const PROFILE_KEY = 'user_profile';
const HISTORY_KEY = 'content_history';

const defaultProfile = {
  hadithWeight: 1,
  surahWeight: 1,
  ceramahWeight: 1,
  engagedHadith: [],
  engagedSurah: [],
  engagedCeramah: [],
  skippedTopics: [],
  morningCount: 0,
  totalInteractions: 0,
  lastUpdated: null,
};

export async function getUserProfile() {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    return data ? { ...defaultProfile, ...JSON.parse(data) } : { ...defaultProfile };
  } catch {
    return { ...defaultProfile };
  }
}

export async function saveUserProfile(profile) {
  profile.lastUpdated = new Date().toISOString();
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function trackInteraction(content, action) {
  const profile = await getUserProfile();
  const history = await getHistory();
  const now = new Date();
  const hour = now.getHours();

  profile.totalInteractions++;

  if (hour >= 4 && hour <= 8) profile.morningCount++;

  if (action === 'engaged') {
    const key = `${content.type}_${content.id}`;
    if (content.type === 'Hadith') {
      profile.hadithWeight = Math.min(profile.hadithWeight + 0.2, 5);
      if (!profile.engagedHadith.includes(key)) {
        profile.engagedHadith.push(key);
      }
    } else if (content.type === 'Surah') {
      profile.surahWeight = Math.min(profile.surahWeight + 0.2, 5);
      if (!profile.engagedSurah.includes(key)) {
        profile.engagedSurah.push(key);
      }
    } else if (content.type === 'Ceramah') {
      profile.ceramahWeight = Math.min(profile.ceramahWeight + 0.2, 5);
      if (!profile.engagedCeramah.includes(key)) {
        profile.engagedCeramah.push(key);
      }
    }
  } else if (action === 'skipped') {
    const topicKey = content.type + '_' + (content.surah || content.speaker || content.title);
    if (!profile.skippedTopics.includes(topicKey)) {
      profile.skippedTopics.push(topicKey);
    }
    if (content.type === 'Hadith') profile.hadithWeight = Math.max(profile.hadithWeight - 0.1, 0.3);
    if (content.type === 'Surah') profile.surahWeight = Math.max(profile.surahWeight - 0.1, 0.3);
    if (content.type === 'Ceramah') profile.ceramahWeight = Math.max(profile.ceramahWeight - 0.1, 0.3);
  }

  await saveUserProfile(profile);

  history.push({
    contentId: `${content.type}_${content.id}`,
    type: content.type,
    title: content.title,
    action,
    timestamp: now.toISOString(),
  });
  if (history.length > 200) history.shift();
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function getHistory() {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getRecommendedContent(type) {
  const profile = await getUserProfile();
  const history = await getHistory();
  const recentIds = history.slice(-10).map((h) => h.contentId);

  let pool;
  if (type === 'hadith') {
    pool = [...wakeUpHadith];
  } else if (type === 'surah') {
    pool = [...wakeUpSurah];
  } else if (type === 'ceramah') {
    pool = [...wakeUpCeramah];
  } else {
    const weights = [
      profile.hadithWeight,
      profile.surahWeight,
      profile.ceramahWeight,
    ];
    const total = weights.reduce((a, b) => a + b, 0);
    const rand = Math.random() * total;
    if (rand < weights[0]) pool = [...wakeUpHadith];
    else if (rand < weights[0] + weights[1]) pool = [...wakeUpSurah];
    else pool = [...wakeUpCeramah];
  }

  const unengaged = pool.filter((c) => !recentIds.includes(c.id));
  const candidates = unengaged.length > 0 ? unengaged : pool;

  const scored = candidates.map((c) => {
    let score = Math.random();
    const ckey = `${c.type}_${c.id}`;
    const topicKey = c.type + '_' + (c.surah || c.speaker || c.title);
    if (profile.skippedTopics.includes(topicKey)) score -= 2;
    if (profile.engagedHadith.includes(ckey)) score += 1;
    if (profile.engagedSurah.includes(ckey)) score += 1;
    if (profile.engagedCeramah.includes(ckey)) score += 1;
    return { content: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const chosen = scored[0].content;

  return chosen;
}
