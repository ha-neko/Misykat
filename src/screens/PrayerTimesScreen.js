import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { calculatePrayerTimes, formatPrayerTime, prayerNames, prayerOrder } from '../utils/prayerTimes';
import { schedulePrayerAlarms } from '../utils/notifications';
import AppLogo from '../components/AppLogo';
import { SunriseIcon, SunIcon, SunsetIcon, CrescentIcon } from '../components/Icons';
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

export default function PrayerTimesScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alarmActive, setAlarmActive] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { getLocation(); }, []);

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
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retry} onPress={getLocation} activeOpacity={0.85}>
            <Text style={s.retryBtnText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const next = getNext();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Text style={s.title}>{t('prayerTimes')}</Text>
          <AppLogo size={22} color={colors.primary} />
        </View>

        {next && (
          <View style={s.nextCard}>
            <Text style={s.nextLabel}>{t('nextPrayer')}</Text>
            {(() => {
              const Icon = prayerIcons[next.key] || SunIcon;
              return (
                <View style={s.nextIcon}>
                  <Icon color={colors.primary} size={32} />
                </View>
              );
            })()}
            <Text style={s.nextName}>{next.name}</Text>
            <Text style={s.nextTime}>{formatPrayerTime(next.time)}</Text>
            <View style={s.nextDivider} />
          </View>
        )}

        <View style={s.listCard}>
          {prayerOrder.map((key) => {
            const Icon = prayerIcons[key];
            const isNext = next?.key === key;
            return (
              <View key={key} style={[s.prayerRow, isNext && s.prayerRowNext]}>
                <View style={s.prayerLeft}>
                  <View style={[s.prayerIconWrap, isNext && s.prayerIconActive]}>
                    <Icon color={isNext ? colors.onPrimary : colors.primary} size={14} />
                  </View>
                  <Text style={[s.prayerName, isNext && s.prayerNameNext]}>{t(key)}</Text>
                </View>
                <Text style={[s.prayerTime, isNext && s.prayerTimeNext]}>
                  {prayerTimes ? formatPrayerTime(prayerTimes[key]) : '--:--'}
                </Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.enableBtn, alarmActive && s.enabledBtn]}
          onPress={handleEnable}
          activeOpacity={0.85}
        >
          <Text style={[s.enableBtnText, alarmActive && s.enabledBtnText]}>
            {alarmActive ? t('alarmActive') : t('enableAlarm')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.refresh} onPress={getLocation}>
          <Text style={s.refreshText}>{t('refreshLocation')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { paddingBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: c.error, fontSize: 15, textAlign: 'center', marginHorizontal: 20 },
  retry: { marginTop: 16, backgroundColor: c.primary, borderRadius: 12, padding: 14, paddingHorizontal: 28 },
  retryBtnText: { color: c.onPrimary, fontWeight: '600' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: c.onSurface, letterSpacing: 0.2 },
  nextCard: {
    alignItems: 'center', marginHorizontal: 16, backgroundColor: c.surface, borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  nextLabel: { fontSize: 10, color: c.onSurfaceVariant, fontWeight: '600', letterSpacing: 1.5, marginBottom: 12 },
  nextIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: c.primaryContainer, justifyContent: 'center', alignItems: 'center',
  },
  nextName: { fontSize: 20, fontWeight: '600', color: c.onSurface, marginTop: 12 },
  nextTime: {
    fontSize: 38, fontWeight: '300', color: c.primary, marginTop: 4,
    letterSpacing: -1, fontVariant: ['tabular-nums'],
  },
  nextDivider: { width: 40, height: 3, backgroundColor: c.primary, borderRadius: 2, marginTop: 16, opacity: 0.3 },
  listCard: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: c.surface, borderRadius: 16, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  prayerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: c.borderLight,
  },
  prayerRowNext: { backgroundColor: c.primaryContainer },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prayerIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: c.primaryContainer, justifyContent: 'center', alignItems: 'center',
  },
  prayerIconActive: { backgroundColor: c.primary },
  prayerName: { fontSize: 14, color: c.onSurface, fontWeight: '500' },
  prayerNameNext: { fontWeight: '700', color: c.onPrimaryContainer },
  prayerTime: { fontSize: 14, color: c.primary, fontWeight: '600', fontVariant: ['tabular-nums'] },
  prayerTimeNext: { color: c.onPrimaryContainer, fontWeight: '700' },
  enableBtn: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: c.primary, borderRadius: 14,
    padding: 16, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  enabledBtn: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.primary },
  enableBtnText: { fontSize: 14, color: c.onPrimary, fontWeight: '600', letterSpacing: 0.3 },
  enabledBtnText: { color: c.primary },
  refresh: { margin: 16, alignItems: 'center' },
  refreshText: { fontSize: 12, color: c.outline, fontWeight: '500' },
});
