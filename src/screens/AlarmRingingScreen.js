import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated, Platform,
} from 'react-native';
import { Audio } from 'expo-av';
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
  const { content: passedContent, isPrayer, contentType, customSound } = route.params || {};
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
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }

  async function playAudio(c) {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch {}

    if (customSound) {
      try {
        setAudioStatus(t('playing'));
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: customSound },
          { shouldPlay: true, isLooping: isPrayer, volume: 1.0 }
        );
        setSound(newSound);
        setAudioStatus('');
        setIsLoading(false);
        return;
      } catch { setIsLoading(false); return; }
    }

    const firstSrc = getAudioForContent(c, isPrayer);
    if (!firstSrc) { setIsLoading(false); return; }
    setAudioInfo(firstSrc);

    const sources = [firstSrc];
    for (let i = 0; i < 3; i++) {
      const alt = getAudioForContent(c, isPrayer);
      if (alt && alt.cacheKey !== firstSrc.cacheKey) sources.push(alt);
    }

    for (const src of sources) {
      try {
        setAudioInfo(src);
        let uri = src.url;
        try {
          const cached = await getCachedAudio(src.cacheKey, src.url);
          if (cached) uri = cached.uri;
        } catch {}
        setAudioStatus(t('playing'));
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true, isLooping: isPrayer, volume: 1.0 }
        );
        setSound(newSound);
        setAudioStatus('');
        setIsLoading(false);
        return;
      } catch {}
    }

    setIsLoading(false);
  }

  async function stopAlarm() {
    if (!interactionTracked && content) {
      setInteractionTracked(true);
      trackInteraction(content, 'engaged');
    }
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
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    navigation.goBack();
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Animated.View style={[s.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <AppLogo size={64} color={colors.primary} />
        </Animated.View>

        <Text style={s.alarmTitle}>
          {isPrayer ? t('prayerTime') : t('wakeUp')}
        </Text>

        {isLoading ? (
          <Text style={s.statusText}>{audioStatus || t('loading')}</Text>
        ) : audioInfo && !isLoading && audioInfo.name ? (
          <Text style={s.audioName}>{audioInfo.name}</Text>
        ) : null}

        <View style={s.divider} />

        {isPrayer ? (
          <View style={s.card}>
            <Text style={s.prayerText}>{t('prayNow')}</Text>
            <Text style={s.prayerSubtext}>
              "Sesungguhnya sholat itu adalah kewajiban yang ditentukan waktunya atas orang-orang yang beriman" (QS. An-Nisa: 103)
            </Text>
          </View>
        ) : content ? (
          <View style={s.card}>
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
        ) : null}

        <View style={s.buttons}>
          <TouchableOpacity style={s.snoozeButton} onPress={snoozeAlarm} activeOpacity={0.7}>
            <Text style={s.snoozeText}>{t('snooze')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.stopButton} onPress={stopAlarm} activeOpacity={0.85}>
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
  logoContainer: { marginBottom: 16 },
  alarmTitle: { fontSize: 28, fontWeight: '600', color: c.primary, marginBottom: 4, letterSpacing: 0.3 },
  statusText: { color: c.onSurfaceVariant, fontSize: 13, marginBottom: 12 },
  audioName: { color: c.accent, fontSize: 11, marginBottom: 16, fontStyle: 'italic', letterSpacing: 0.3 },
  divider: { width: 40, height: 3, backgroundColor: c.primary, borderRadius: 2, marginBottom: 20, opacity: 0.2 },
  card: {
    backgroundColor: c.surface, borderRadius: 20, padding: 24, width: '100%', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  prayerText: { fontSize: 18, fontWeight: '700', color: c.error, marginBottom: 12, textAlign: 'center' },
  prayerSubtext: {
    fontSize: 13, color: c.onSurfaceVariant, textAlign: 'center', fontStyle: 'italic',
    lineHeight: 20, paddingHorizontal: 8,
  },
  typeBadge: {
    backgroundColor: c.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, marginBottom: 16,
  },
  typeText: { color: c.onPrimary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  contentTitle: { fontSize: 20, fontWeight: '700', color: c.onSurface, textAlign: 'center', marginBottom: 14 },
  arabic: {
    fontSize: 24, color: c.accent, textAlign: 'center', marginBottom: 14,
    lineHeight: 38, writingDirection: 'rtl',
  },
  translation: {
    fontSize: 14, color: c.onSurfaceVariant, textAlign: 'center', marginBottom: 8,
    fontStyle: 'italic', lineHeight: 22,
  },
  explanation: { fontSize: 12, color: c.outline, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  source: { fontSize: 11, color: c.primary, marginTop: 10, fontStyle: 'italic', opacity: 0.7 },
  topic: { fontSize: 12, color: c.outline, textAlign: 'center', marginTop: 8, lineHeight: 18, fontStyle: 'italic' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 28 },
  snoozeButton: {
    backgroundColor: c.surface, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
    borderWidth: 1, borderColor: c.outlineVariant,
  },
  snoozeText: { color: c.onSurfaceVariant, fontSize: 15, fontWeight: '500' },
  stopButton: {
    backgroundColor: c.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  stopText: { color: c.onPrimary, fontSize: 15, fontWeight: '600' },
});
