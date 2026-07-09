import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import AppLogo from '../components/AppLogo';
import { getAudioForContent } from '../utils/audioSources';
import { getCachedAudio } from '../utils/cacheManager';
import { getRecommendedContent, trackInteraction } from '../utils/recommendation';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

export default function AlarmRingingScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { content: passedContent, isPrayer, contentType } = route.params || {};
  const [content, setContent] = useState(null);
  const [sound, setSound] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [audioInfo, setAudioInfo] = useState(null);
  const [audioStatus, setAudioStatus] = useState('');
  const [interactionTracked, setInteractionTracked] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Notifications.dismissAllNotificationsAsync().catch(() => {});
    loadContent();
    startPulse();
    return () => {
      if (sound) sound.unloadAsync();
      Speech.stop();
    };
  }, []);

  async function loadContent() {
    const c = passedContent || await getRecommendedContent(contentType);
    setContent(c);
    playAudio(c);
  }

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }

  async function playAudio(c) {
    const firstSrc = getAudioForContent(c, isPrayer);
    if (!firstSrc) { setIsLoading(false); return; }
    setAudioInfo(firstSrc);

    const sources = [firstSrc];

    if (c.type === 'Surah') {
      for (let i = 0; i < 4; i++) {
        const alt = getAudioForContent(c, isPrayer);
        if (alt && alt.cacheKey !== firstSrc.cacheKey) sources.push(alt);
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const alt = getAudioForContent(c, isPrayer);
        if (alt && alt.cacheKey !== firstSrc.cacheKey) sources.push(alt);
      }
    }

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch {}

    for (const src of sources) {
      try {
        setAudioInfo(src);
        setAudioStatus(t('playing'));
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: src.url },
          { shouldPlay: true, isLooping: isPrayer, volume: 1.0 }
        );
        setSound(newSound);
        getCachedAudio(src.cacheKey, src.url).catch(() => {});
        setAudioStatus('');
        setIsLoading(false);
        return;
      } catch {}
    }

    try {
      setAudioStatus(t('streamFailed'));
      const src = sources[0];
      const cached = await getCachedAudio(src.cacheKey, src.url);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: cached.uri },
        { shouldPlay: true, isLooping: isPrayer, volume: 1.0 }
      );
      setSound(newSound);
      setAudioStatus('');
    } catch {
      try {
        setAudioStatus(t('usingTTS'));
        const fb = getAudioForContent(c, isPrayer)?.fallback;
        if (fb?.text) {
          Speech.speak(fb.text, {
            language: fb.lang === 'ar' ? 'ar' : 'id-ID',
            rate: 0.85,
            pitch: 1.0,
          });
        }
      } catch {}
    } finally {
      setIsLoading(false);
    }
  }

  async function stopAlarm() {
    if (!interactionTracked && content) {
      setInteractionTracked(true);
      trackInteraction(content, 'engaged');
    }
    Speech.stop();
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    navigation.goBack();
  }

  async function snoozeAlarm() {
    if (!interactionTracked && content) {
      setInteractionTracked(true);
      trackInteraction(content, 'skipped');
    }
    Speech.stop();
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    navigation.goBack();
  }

  const s = makeStyles(colors);

  if (!content) return null;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Animated.View style={[s.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <AppLogo size={48} color={colors.accent} />
        </Animated.View>

        <Text style={s.alarmTitle}>
          {isPrayer ? t('prayerTime') : t('wakeUp')}
        </Text>

        {isLoading ? (
          <Text style={s.statusText}>{audioStatus || t('loading')}</Text>
        ) : audioInfo && !isLoading && audioInfo.name ? (
          <Text style={s.audioName}>{audioInfo.name}</Text>
        ) : null}

        {isPrayer ? (
          <View style={s.prayerCard}>
            <Text style={s.prayerText}>{t('prayNow')}</Text>
            <Text style={s.prayerSubtext}>
              "Sesungguhnya sholat itu adalah kewajiban yang ditentukan waktunya atas orang-orang yang beriman" (QS. An-Nisa: 103)
            </Text>
          </View>
        ) : (
          <View style={s.contentCard}>
            <View style={s.typeBadge}>
              <Text style={s.typeText}>{content.type}</Text>
            </View>
            <Text style={s.contentTitle}>{content.title}</Text>
            {content.arabic && (
              <Text style={s.arabic}>{content.arabic}</Text>
            )}
            <Text style={s.translation}>{content.translation}</Text>
            {content.explanation && (
              <Text style={s.explanation}>{content.explanation}</Text>
            )}
            {content.source && (
              <Text style={s.source}>— {content.source}</Text>
            )}
            {content.speaker && (
              <Text style={s.source}>— {content.speaker}</Text>
            )}
            {content.topic && (
              <Text style={s.topic}>{content.topic}</Text>
            )}
          </View>
        )}

        <View style={s.buttons}>
          <TouchableOpacity style={s.snoozeButton} onPress={snoozeAlarm}>
            <Text style={s.snoozeText}>{t('snooze')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.stopButton} onPress={stopAlarm}>
            <Text style={s.stopText}>{t('dismiss')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoContainer: { marginBottom: 20 },
  alarmTitle: { fontSize: 28, fontWeight: '800', color: c.accent, marginBottom: 8, letterSpacing: 0.5 },
  statusText: { color: c.textSecondary, fontSize: 13, marginBottom: 16 },
  audioName: { color: '#fdcb6e', fontSize: 11, marginBottom: 20, fontStyle: 'italic', letterSpacing: 0.3 },
  prayerCard: {
    backgroundColor: c.card, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  prayerText: { fontSize: 18, fontWeight: '700', color: '#e74c3c', marginBottom: 12, textAlign: 'center' },
  prayerSubtext: { fontSize: 13, color: c.textSecondary, textAlign: 'center', fontStyle: 'italic', lineHeight: 20 },
  contentCard: {
    backgroundColor: c.card, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: c.border,
  },
  typeBadge: {
    backgroundColor: c.accent, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16,
  },
  typeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  contentTitle: { fontSize: 20, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 14 },
  arabic: {
    fontSize: 24, color: '#fdcb6e', textAlign: 'center', marginBottom: 14,
    lineHeight: 38, writingDirection: 'rtl',
  },
  translation: { fontSize: 14, color: c.textSecondary, textAlign: 'center', marginBottom: 8, fontStyle: 'italic', lineHeight: 22 },
  explanation: { fontSize: 12, color: c.textTertiary, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  source: { fontSize: 11, color: c.accent, marginTop: 10, fontStyle: 'italic', opacity: 0.7 },
  topic: { fontSize: 12, color: c.textTertiary, textAlign: 'center', marginTop: 8, lineHeight: 18, fontStyle: 'italic' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 28 },
  snoozeButton: {
    backgroundColor: c.card, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32,
    borderWidth: 1, borderColor: c.border,
  },
  snoozeText: { color: c.textSecondary, fontSize: 15, fontWeight: '600' },
  stopButton: {
    backgroundColor: c.accent, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32,
  },
  stopText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
