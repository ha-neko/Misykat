import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { calculatePrayerTimes, formatPrayerTime, prayerOrder } from '../utils/prayerTimes';
import { getHijriDateString } from '../utils/hijri';
import { schedulePrayerAlarms } from '../utils/notifications';
import AppLogo from '../components/AppLogo';
import { SunriseIcon, SunIcon, SunsetIcon, CrescentIcon, StarIcon } from '../components/Icons';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

const prayerIcons = {
  fajr: SunriseIcon,
  sunrise: SunIcon,
  dhuhr: SunIcon,
  asr: SunIcon,
  maghrib: SunsetIcon,
  isha: CrescentIcon,
};

function PrayerIcon({ name, color, size }) {
  const Icon = prayerIcons[name] || SunIcon;
  return <Icon color={color} size={size} />;
}

export default function PrayerTimesScreen() {
  const { colors } = useTheme();
  const { t, lang } = useLocale();
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alarmActive, setAlarmActive] = useState(false);
  const [error, setError] = useState(null);
  const [fadeIn] = useState(new Animated.Value(0));

  useEffect(() => { getLocation(); }, []);

  useEffect(() => {
    if (!loading && prayerTimes) {
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [loading, prayerTimes]);

  async function getLocation() {
    try {
      setLoading(true);
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(t('locationPermError'));
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      setPrayerTimes(calculatePrayerTimes(loc.coords.latitude, loc.coords.longitude));
    } catch {
      setError(t('locationError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable() {
    if (!prayerTimes) return;
    try {
      await schedulePrayerAlarms(prayerTimes);
      setAlarmActive(true);
      Alert.alert(t('success'), t('alarmEnabled'));
    } catch {
      Alert.alert(t('error'), t('alarmEnableFailed'));
    }
  }

  function getNext() {
    if (!prayerTimes) return null;
    const now = new Date();
    for (const p of prayerOrder) {
      if (prayerTimes[p] > now) return { name: t(p), time: prayerTimes[p], key: p };
    }
    return null;
  }

  const s = makeStyles(colors);
  const next = getNext();
  const hijriStr = getHijriDateString(new Date(), lang);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <View style={s.errorCard}>
            <Text style={s.errorEmoji}>⚠</Text>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retry} onPress={getLocation} activeOpacity={0.85}>
              <Text style={s.retryBtnText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.topDecoration}>
          <View style={s.decoDot} />
          <View style={s.decoDot} />
          <View style={s.decoDot} />
        </View>

        <View style={s.hijriCard}>
          <View style={s.hijriLeft}>
            <View style={s.hijriIconWrap}>
              <CrescentIcon color={colors.accent} size={20} />
            </View>
          </View>
          <View style={s.hijriBody}>
            <Text style={s.hijriLabel}>{t('hijriDate')}</Text>
            <Text style={s.hijriDate}>{hijriStr}</Text>
          </View>
          <View style={s.hijriRight}>
            <Text style={s.hijriDay}>{new Date().getDate()}</Text>
            <Text style={s.hijriGregLabel}>
              {new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeIn }}>
          {next && (
            <View style={s.nextCard}>
              <View style={s.nextAccent}>
                <View style={s.nextAccentBar} />
              </View>
              <Text style={s.nextLabel}>{t('nextPrayer')}</Text>
              <View style={s.nextIconWrap}>
                <PrayerIcon name={next.key} color={colors.onPrimary} size={28} />
              </View>
              <Text style={s.nextName}>{next.name}</Text>
              <Text style={s.nextTime}>{formatPrayerTime(next.time)}</Text>
              <View style={s.nextMeta}>
                <View style={s.metaDot} />
                <Text style={s.metaText}>
                  {new Date(next.time).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
            </View>
          )}

          <View style={s.listCard}>
            <View style={s.listHeader}>
              <Text style={s.listTitle}>{t('prayerTimes')}</Text>
              <View style={s.listTitleLine} />
            </View>
            {prayerOrder.map((key) => {
              const isNext = next?.key === key;
              return (
                <View key={key} style={[s.prayerRow, isNext && s.prayerRowNext]}>
                  <View style={s.prayerLeft}>
                    <View style={[s.prayerIconWrap, isNext && s.prayerIconActive]}>
                      <PrayerIcon name={key} color={isNext ? colors.onPrimary : colors.primary} size={13} />
                    </View>
                    <View>
                      <Text style={[s.prayerName, isNext && s.prayerNameNext]}>{t(key)}</Text>
                      {isNext && <Text style={s.nextBadge}>{t('nextPrayer').charAt(0)}</Text>}
                    </View>
                  </View>
                  <View style={s.prayerRight}>
                    <Text style={[s.prayerTime, isNext && s.prayerTimeNext]}>
                      {prayerTimes ? formatPrayerTime(prayerTimes[key]) : '--:--'}
                    </Text>
                    {isNext && <View style={s.prayerArrow}><StarIcon color={colors.accent} size={10} /></View>}
                  </View>
                </View>
              );
            })}
            <View style={s.listFooter}>
              <View style={s.listFooterDot} />
              <View style={s.listFooterDot} />
              <View style={s.listFooterDot} />
            </View>
          </View>

          <TouchableOpacity
            style={[s.enableBtn, alarmActive && s.enabledBtn]}
            onPress={handleEnable}
            activeOpacity={0.85}
          >
            <View style={s.enableBtnInner}>
              <View style={[s.enableDot, alarmActive && s.enableDotActive]} />
              <Text style={[s.enableBtnText, alarmActive && s.enabledBtnText]}>
                {alarmActive ? t('alarmActive') : t('enableAlarm')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.refresh} onPress={getLocation}>
            <Text style={s.refreshText}>{t('refreshLocation')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorCard: {
    backgroundColor: c.surface, borderRadius: 20, padding: 32, alignItems: 'center',
    marginHorizontal: 32,
    ...Platform.select({ ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 2 } }),
  },
  errorEmoji: { fontSize: 32, marginBottom: 12 },
  errorText: { color: c.error, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retry: { marginTop: 20, backgroundColor: c.primary, borderRadius: 12, padding: 14, paddingHorizontal: 32 },
  retryBtnText: { color: c.onPrimary, fontWeight: '600', fontSize: 14 },

  topDecoration: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 6, paddingBottom: 4,
  },
  decoDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent, opacity: 0.3,
  },

  hijriCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 8, marginBottom: 16,
    backgroundColor: c.surface, borderRadius: 18,
    padding: 14, paddingRight: 18,
    borderWidth: 1, borderColor: c.accent + '25',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  hijriLeft: { marginRight: 10 },
  hijriIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: c.accent + '18', justifyContent: 'center', alignItems: 'center',
  },
  hijriBody: { flex: 1 },
  hijriLabel: { fontSize: 10, color: c.onSurfaceVariant, fontWeight: '600', letterSpacing: 1, marginBottom: 2 },
  hijriDate: { fontSize: 16, color: c.accent, fontWeight: '700', letterSpacing: 0.3 },
  hijriRight: { alignItems: 'flex-end' },
  hijriDay: { fontSize: 20, fontWeight: '300', color: c.onSurface, fontVariant: ['tabular-nums'] },
  hijriGregLabel: { fontSize: 10, color: c.onSurfaceVariant, fontWeight: '500', marginTop: 1 },

  nextCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: c.primary, borderRadius: 22,
    padding: 24, paddingTop: 20, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  nextAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
  },
  nextAccentBar: {
    width: 60, height: 3, backgroundColor: c.accent, borderTopLeftRadius: 2, borderTopRightRadius: 2,
  },
  nextLabel: { fontSize: 10, color: c.onPrimary, fontWeight: '700', letterSpacing: 2, opacity: 0.8, marginBottom: 12 },
  nextIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: c.onPrimary + '20', justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  nextName: { fontSize: 22, fontWeight: '700', color: c.onPrimary, marginBottom: 2 },
  nextTime: {
    fontSize: 42, fontWeight: '200', color: c.onPrimary,
    letterSpacing: -1.5, fontVariant: ['tabular-nums'], lineHeight: 48,
  },
  nextMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.onPrimary, opacity: 0.4 },
  metaText: { fontSize: 11, color: c.onPrimary, opacity: 0.7, fontWeight: '500' },

  listCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: c.surface, borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  listHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4,
  },
  listTitle: { fontSize: 12, color: c.onSurfaceVariant, fontWeight: '600', letterSpacing: 1.2 },
  listTitleLine: { flex: 1, height: 1, backgroundColor: c.borderLight },
  prayerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    marginHorizontal: 2, borderRadius: 12,
  },
  prayerRowNext: { backgroundColor: c.primaryContainer, marginHorizontal: 6, paddingHorizontal: 12, marginVertical: 2 },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  prayerIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: c.primaryContainer, justifyContent: 'center', alignItems: 'center',
  },
  prayerIconActive: { backgroundColor: c.primary },
  prayerName: { fontSize: 14, color: c.onSurface, fontWeight: '500' },
  prayerNameNext: { fontWeight: '700', color: c.onPrimaryContainer },
  nextBadge: {
    fontSize: 9, color: c.accent, fontWeight: '800', letterSpacing: 1, marginTop: 1,
  },
  prayerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prayerTime: {
    fontSize: 14, color: c.primary, fontWeight: '600',
    fontVariant: ['tabular-nums'], letterSpacing: 1,
  },
  prayerTimeNext: { color: c.onPrimaryContainer, fontWeight: '700' },
  prayerArrow: { width: 16, alignItems: 'center' },
  listFooter: {
    flexDirection: 'row', justifyContent: 'center', gap: 4, paddingVertical: 10,
  },
  listFooterDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: c.outlineVariant },

  enableBtn: {
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: c.primary, borderRadius: 16,
    padding: 16, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  enabledBtn: { backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.primary },
  enableBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  enableDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.onPrimary },
  enableDotActive: { backgroundColor: c.primary },
  enableBtnText: { fontSize: 14, color: c.onPrimary, fontWeight: '600', letterSpacing: 0.3 },
  enabledBtnText: { color: c.primary },
  refresh: { margin: 12, alignItems: 'center' },
  refreshText: { fontSize: 12, color: c.outline, fontWeight: '500' },
});
