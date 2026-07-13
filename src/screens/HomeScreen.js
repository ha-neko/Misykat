import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Alert, Platform,
  Animated, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getAlarms, deleteAlarm, toggleAlarm } from '../utils/notifications';
import AppLogo from '../components/AppLogo';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';
import { AlarmIcon, AddIcon } from '../components/TabIcons';
import { getHijriDateString } from '../utils/hijri';
import { CrescentIcon } from '../components/Icons';

const typeColors = { Hadith: '#4C5A92', Surah: '#006B5E', Lecture: '#7B5800', Random: '#707973' };
const USERNAME_KEY = 'app_username';

function AlarmRow({ item, onToggle, onDelete, onEdit, index, colors, label, s }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const contentType = item.contentType || 'random';
  const colorKey = contentType === 'hadith' ? 'Hadith' : contentType === 'surah' ? 'Surah' : contentType === 'ceramah' ? 'Lecture' : 'Random';
  const accentColor = typeColors[colorKey] || '#707973';
  const enabled = item.enabled;

  function formatTime(h, m) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={[s.alarmCard, !enabled && s.alarmDisabled]}
        onPress={() => onEdit(item)}
        onLongPress={() => onDelete(item.id)}
        activeOpacity={0.7}
      >
        <View style={[s.accentBar, { backgroundColor: enabled ? accentColor : colors.outlineVariant }]} />
        <View style={s.alarmContent}>
          <View style={s.alarmTop}>
            <Text style={[s.alarmTime, !enabled && s.textMuted]}>
              {formatTime(item.hour, item.minute)}
            </Text>
            <View style={[s.badge, { backgroundColor: accentColor + '18' }]}>
              <View style={[s.badgeDot, { backgroundColor: accentColor }]} />
              <Text style={[s.badgeText, { color: accentColor }]}>{label}</Text>
            </View>
          </View>
          {item.label ? <Text style={s.alarmLabel}>{item.label}</Text> : null}
          {item.days && item.days.length > 0 && (
            <Text style={s.days}>{item.days.join(', ')}</Text>
          )}
        </View>
        <Switch
          value={enabled}
          onValueChange={() => { Vibration.vibrate(10); onToggle(item.id); }}
          trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
          thumbColor={enabled ? colors.primary : colors.onSurfaceVariant}
          ios_backgroundColor={colors.outlineVariant}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, lang } = useLocale();
  const [alarms, setAlarms] = useState([]);
  const [username, setUsername] = useState('');
  const logoAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadAlarms();
      AsyncStorage.getItem(USERNAME_KEY).then((n) => {
        if (n) setUsername(n);
      }).catch(() => {});
    }, [])
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(logoAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function loadAlarms() {
    try {
      let data = await getAlarms();
      data.sort((a, b) => a.hour !== b.hour ? a.hour - b.hour : a.minute - b.minute);
      setAlarms(data);
    } catch {}
  }

  async function handleToggle(id) {
    try {
      setAlarms(await toggleAlarm(id));
    } catch {}
  }

  function handleEdit(alarm) {
    navigation.navigate('EditAlarm', { alarm });
  }

  function handleDelete(id) {
    Alert.alert(t('deleteTitle'), t('deleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
        Vibration.vibrate(20);
        setAlarms(await deleteAlarm(id));
      }},
    ]);
  }

  function getNext() {
    if (alarms.length === 0) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let next = null;
    let nextDiff = Infinity;
    for (const a of alarms) {
      if (!a.enabled) continue;
      const alarmMins = a.hour * 60 + a.minute;
      let diff = alarmMins - currentMinutes;
      if (diff <= 0) diff += 1440;
      if (diff < nextDiff) { nextDiff = diff; next = a; }
    }
    return next;
  }

  function formatTime24(h, m) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const next = getNext();
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>{t('greeting')}{username ? `, ${username}` : ''}</Text>
            <Text style={s.title}>Misykat</Text>
            <View style={s.hijriRow}>
              <CrescentIcon color={colors.accent} size={10} />
              <Text style={s.hijriDate}>{getHijriDateString(new Date(), lang)}</Text>
            </View>
          </View>
          <Animated.View style={{ opacity: logoAnim.interpolate({
            inputRange: [0, 1], outputRange: [0.6, 1],
          })}}>
            <AppLogo size={28} color={colors.primary} />
          </Animated.View>
        </View>
      </View>

      <View style={s.topDecoration}>
        <View style={s.decoDot} />
        <View style={s.decoDot} />
        <View style={s.decoDot} />
      </View>

      {next && (
        <TouchableOpacity style={s.nextCard} activeOpacity={0.85}>
          <View style={s.nextAccentBar} />
          <View style={s.nextContent}>
            <View style={s.nextLeft}>
              <Text style={s.nextLabel}>{t('nextAlarm')}</Text>
              <Text style={s.nextTime}>{formatTime24(next.hour, next.minute)}</Text>
              {next.label && <Text style={s.nextName}>{next.label}</Text>}
              <View style={s.nextMeta}>
                <View style={s.metaDot} />
                <Text style={s.nextMetaText}>{t('alarmActive')}</Text>
              </View>
            </View>
            <View style={s.nextRight}>
              <View style={s.nextIcon}>
                <AlarmIcon color={colors.onPrimary} size={20} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {alarms.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyCircle}>
            <AppLogo size={36} color={colors.outline} />
          </View>
          <Text style={s.emptyTitle}>{t('noAlarm')}</Text>
          <Text style={s.emptyHint}>{t('noAlarmHint')}</Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => navigation.navigate('AddAlarm')}
            activeOpacity={0.85}
          >
            <AddIcon color={colors.onPrimary} size={16} />
            <Text style={s.emptyBtnText}>{t('tabAdd')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const ct = item.contentType || 'random';
            const lk = ct === 'hadith' ? 'hadith' : ct === 'surah' ? 'surah' : ct === 'ceramah' ? 'ceramah' : 'random';
            return (
              <AlarmRow
                item={item}
                index={index}
                colors={colors}
                s={s}
              label={t(lk)}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
              />
            );
          }}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('AddAlarm')}
        activeOpacity={0.85}
      >
        <View style={s.fabSurface}>
          <AddIcon color={colors.onPrimaryContainer} size={22} />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  topDecoration: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 8, paddingBottom: 4,
  },
  decoDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent, opacity: 0.3,
  },
  header: {
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4,
    backgroundColor: c.surface,
    borderBottomWidth: 1, borderBottomColor: c.borderLight,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { fontSize: 13, color: c.primary, fontWeight: '500', letterSpacing: 0.3 },
  title: { fontSize: 28, fontWeight: '700', color: c.onSurface, marginTop: 2, letterSpacing: -0.3 },
  hijriRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  hijriDate: { fontSize: 11, color: c.accent, fontWeight: '600', letterSpacing: 0.3 },
  nextCard: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 8,
    backgroundColor: c.primary, borderRadius: 18, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  nextAccentBar: {
    width: 50, height: 3, backgroundColor: c.accent, borderBottomRightRadius: 2,
  },
  nextContent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 14,
  },
  nextLeft: { flex: 1 },
  nextLabel: { fontSize: 10, color: c.onPrimary, fontWeight: '700', letterSpacing: 1.5, opacity: 0.7, marginBottom: 4 },
  nextTime: { fontSize: 32, fontWeight: '700', color: c.onPrimary, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  nextName: { fontSize: 13, color: c.onPrimary, marginTop: 2, opacity: 0.85 },
  nextMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.onPrimary, opacity: 0.4 },
  nextMetaText: { fontSize: 10, color: c.onPrimary, opacity: 0.6, fontWeight: '500' },
  nextRight: { marginLeft: 12 },
  nextIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: c.onPrimary + '20', justifyContent: 'center', alignItems: 'center',
  },
  list: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
  alarmCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surface, borderRadius: 16, marginBottom: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: c.borderLight,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  alarmDisabled: { opacity: 0.4 },
  accentBar: { width: 4, alignSelf: 'stretch', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  alarmContent: { flex: 1, paddingVertical: 12, paddingLeft: 12 },
  alarmTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alarmTime: { fontSize: 26, fontWeight: '700', color: c.onSurface, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  textMuted: { color: c.onSurfaceVariant },
  alarmLabel: { fontSize: 13, color: c.onSurfaceVariant, marginTop: 3 },
  days: { fontSize: 11, color: c.outline, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80,
  },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: c.onSurfaceVariant, marginTop: 8 },
  emptyHint: { fontSize: 14, color: c.outline, marginTop: 4, textAlign: 'center', paddingHorizontal: 48, lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 20, backgroundColor: c.primary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 20,
  },
  emptyBtnText: { color: c.onPrimary, fontSize: 14, fontWeight: '600' },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
  },
  fabSurface: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: c.primaryContainer, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: c.primary + '30',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
});
