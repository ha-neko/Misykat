import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getAlarms, deleteAlarm, toggleAlarm } from '../utils/notifications';
import AppLogo from '../components/AppLogo';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

const typeColors = { Hadith: '#00b894', Surah: '#0984e3', Lecture: '#e17055', Random: '#636e72' };
const USERNAME_KEY = 'app_username';

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
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
          <View style={[s.badge, { backgroundColor: typeColors[colorKey] || '#636e72' }]}>
            <Text style={s.badgeText}>{label}</Text>
          </View>
        </View>
        <Switch
          value={enabled}
          onValueChange={() => handleToggle(item.id)}
          trackColor={{ false: colors.border, true: '#81ecec' }}
          thumbColor={enabled ? '#00b894' : colors.textSecondary}
        />
      </TouchableOpacity>
    );
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{t('greeting')}{username ? `, ${username}` : ''}</Text>
          <Text style={s.title}>Misykat</Text>
        </View>
        <AppLogo size={24} color={colors.accent} />
      </View>

      {alarms.length === 0 ? (
        <View style={s.empty}>
          <AppLogo size={40} color={colors.border} />
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

      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AddAlarm')}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: c.card, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  greeting: { fontSize: 13, color: c.accent, fontWeight: '600', letterSpacing: 0.3 },
  title: { fontSize: 24, fontWeight: '800', color: c.text, marginTop: 2 },
  list: { padding: 16, paddingBottom: 80 },
  alarmCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 10,
  },
  alarmDisabled: { opacity: 0.4 },
  alarmLeft: { flex: 1 },
  alarmTime: { fontSize: 32, fontWeight: '800', color: c.text, letterSpacing: -1 },
  textMuted: { color: c.textSecondary },
  alarmLabel: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8, marginTop: 6,
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: c.textSecondary, marginTop: 12 },
  emptyHint: { fontSize: 14, color: c.textTertiary, marginTop: 4 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center',
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '400', marginTop: -2 },
});
