import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView,
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
        <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retry} onPress={getLocation}>
            <Text style={s.retryBtnText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const next = getNext();

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>{t('prayerTimes')}</Text>
          <AppLogo size={28} color={colors.accent} />
        </View>

        {next && (
          <View style={s.nextCard}>
            <Text style={s.nextLabel}>{t('nextPrayer')}</Text>
            {(() => {
              const Icon = prayerIcons[next.key] || SunIcon;
              return <Icon color={colors.accent} size={36} />;
            })()}
            <Text style={s.nextName}>{next.name}</Text>
            <Text style={s.nextTime}>{formatPrayerTime(next.time)}</Text>
          </View>
        )}

        <View style={s.listCard}>
          {prayerOrder.map((key) => {
            const Icon = prayerIcons[key];
            return (
              <View key={key} style={s.prayerRow}>
                <View style={s.prayerLeft}>
                  <Icon color={colors.accent} size={16} />
                  <Text style={s.prayerName}>{t(key)}</Text>
                </View>
                <Text style={s.prayerTime}>
                  {prayerTimes ? formatPrayerTime(prayerTimes[key]) : '--:--'}
                </Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.enableBtn, alarmActive && s.enabledBtn]}
          onPress={handleEnable}
        >
          <Text style={s.enableBtnText}>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: c.danger, fontSize: 15, textAlign: 'center', marginHorizontal: 20 },
  retry: { marginTop: 16, backgroundColor: c.accent, borderRadius: 12, padding: 14, paddingHorizontal: 28 },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: 0.3 },
  nextCard: {
    alignItems: 'center', marginHorizontal: 16, backgroundColor: c.card, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: c.border,
  },
  nextLabel: { fontSize: 10, color: c.textSecondary, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  nextName: { fontSize: 20, fontWeight: '700', color: c.text, marginTop: 12 },
  nextTime: {
    fontSize: 36, fontWeight: '700', color: c.accent, marginTop: 4,
    letterSpacing: -1, fontVariant: ['tabular-nums'],
  },
  listCard: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: c.card, borderRadius: 16, overflow: 'hidden',
  },
  prayerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: c.borderLight,
  },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prayerName: { fontSize: 14, color: c.text, fontWeight: '600' },
  prayerTime: { fontSize: 14, color: c.accent, fontWeight: '700', fontVariant: ['tabular-nums'] },
  enableBtn: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: c.accent, borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  enabledBtn: { backgroundColor: c.card, borderWidth: 1, borderColor: c.accent },
  enableBtnText: { fontSize: 14, color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  refresh: { margin: 16, alignItems: 'center', paddingBottom: 20 },
  refreshText: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },
});
