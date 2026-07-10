import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getAlarms, deleteAlarm, toggleAlarm } from '../utils/notifications';
import AppLogo from '../components/AppLogo';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

const typeColors = { Hadith: '#4C5A92', Surah: '#006B5E', Lecture: '#7B5800', Random: '#707973' };
const USERNAME_KEY = 'app_username';

export default function HomeScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t } = useLocale();
  const [alarms, setAlarms] = useState([]);
  const [username, setUsername] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadAlarms();
      AsyncStorage.getItem(USERNAME_KEY).then((n) => {
        if (n) setUsername(n);
      }).catch(() => {});
    }, [])
  );

  async function loadAlarms() {
    try {
      const data = await getAlarms();
      data.sort((a, b) => a.hour !== b.hour ? a.hour - b.hour : a.minute - b.minute);
      setAlarms(data);
    } catch {}
  }

  async function handleToggle(id) {
    try {
      setAlarms(await toggleAlarm(id));
    } catch {}
  }

  function handleDelete(id) {
    Alert.alert(t('deleteTitle'), t('deleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
        setAlarms(await deleteAlarm(id));
      }},
    ]);
  }

  function formatTime(h, m) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  function renderAlarm({ item }) {
    const contentType = item.contentType || 'random';
    const labelKey = contentType === 'hadith' ? 'hadith' : contentType === 'surah' ? 'surah' : contentType === 'ceramah' ? 'ceramah' : 'random';
    const label = t(labelKey);
    const colorKey = contentType === 'hadith' ? 'Hadith' : contentType === 'surah' ? 'Surah' : contentType === 'ceramah' ? 'Lecture' : 'Random';
    const enabled = item.enabled;

    return (
      <TouchableOpacity
        style={[s.alarmCard, !enabled && s.alarmDisabled]}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.7}
      >
        <View style={s.alarmLeft}>
          <Text style={[s.alarmTime, !enabled && s.textMuted]}>
            {formatTime(item.hour, item.minute)}
          </Text>
          {item.label ? <Text style={s.alarmLabel}>{item.label}</Text> : null}
          <View style={[s.badge, { backgroundColor: typeColors[colorKey] || '#707973' }]}>
            <Text style={s.badgeText}>{label}</Text>
          </View>
        </View>
        <Switch
          value={enabled}
          onValueChange={() => handleToggle(item.id)}
          trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
          thumbColor={enabled ? colors.primary : colors.onSurfaceVariant}
          ios_backgroundColor={colors.outlineVariant}
        />
      </TouchableOpacity>
    );
  }

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerContent}>
          <View>
            <Text style={s.greeting}>{t('greeting')}{username ? `, ${username}` : ''}</Text>
            <Text style={s.title}>Misykat</Text>
          </View>
          <AppLogo size={28} color={colors.primary} />
        </View>
        <View style={s.divider} />
      </View>

      {alarms.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyCircle}>
            <AppLogo size={36} color={colors.outline} />
          </View>
          <Text style={s.emptyTitle}>{t('noAlarm')}</Text>
          <Text style={s.emptyHint}>{t('noAlarmHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          renderItem={renderAlarm}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AddAlarm')} activeOpacity={0.85}>
        <View style={s.fabSurface}>
          <Text style={s.fabText}>+</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const makeStyles = (c, d) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
    backgroundColor: c.surface,
  },
  headerContent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  divider: {
    height: 1, backgroundColor: c.border, marginTop: 12, marginBottom: 0,
    opacity: 0.5,
  },
  greeting: { fontSize: 13, color: c.primary, fontWeight: '500', letterSpacing: 0.3 },
  title: { fontSize: 28, fontWeight: '700', color: c.onSurface, marginTop: 2, letterSpacing: -0.3 },
  list: { padding: 16, paddingBottom: 100, paddingTop: 8 },
  alarmCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  alarmDisabled: { opacity: 0.4 },
  alarmLeft: { flex: 1 },
  alarmTime: { fontSize: 34, fontWeight: '600', color: c.onSurface, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  textMuted: { color: c.onSurfaceVariant },
  alarmLabel: { fontSize: 13, color: c.onSurfaceVariant, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 6, marginTop: 6,
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80,
  },
  emptyCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: c.onSurfaceVariant, marginTop: 8 },
  emptyHint: { fontSize: 14, color: c.outline, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  fab: {
    position: 'absolute', right: 16, bottom: 16,
  },
  fabSurface: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: c.primaryContainer, justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  fabText: { fontSize: 28, color: c.onPrimaryContainer, fontWeight: '300', marginTop: -2 },
});
