import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
  TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { clearAudioCache } from '../utils/cacheManager';
import { getUserProfile } from '../utils/recommendation';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';
import { SunIcon, CrescentIcon } from '../components/Icons';

const USERNAME_KEY = 'app_username';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, lang, setLanguage } = useLocale();
  const [cacheSize, setCacheSize] = useState('0 B');
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => { loadInfo(); }, []);

  async function loadInfo() {
    try {
      const p = await getUserProfile();
      setProfile(p);
      const name = await AsyncStorage.getItem(USERNAME_KEY);
      if (name) setUsername(name);

      const dir = FileSystem.documentDirectory + 'audio_cache/';
      const info = await FileSystem.getInfoAsync(dir);
      if (info.exists && info.size) {
        const size = info.size;
        setCacheSize(size > 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`);
      }
    } catch {}
  }

  function openNameEditor() {
    setTempName(username);
    setShowNameModal(true);
  }

  async function saveName() {
    const name = tempName.trim();
    setUsername(name);
    setShowNameModal(false);
    await AsyncStorage.setItem(USERNAME_KEY, name);
  }

  async function handleClearCache() {
    Alert.alert(t('clearCache'), t('clearCacheConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: async () => {
          await clearAudioCache();
          setCacheSize('0 B');
          Alert.alert(t('success'), t('cacheCleared'));
        },
      },
    ]);
  }

  function getWeightBar(val) {
    const pct = Math.min((val / 5) * 100, 100);
    return (
      <View style={[s.weightTrack, { backgroundColor: colors.border }]}>
        <View style={[s.weightFill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
      </View>
    );
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.pageTitle}>{t('settings')}</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('profile')}</Text>
          <TouchableOpacity style={s.row} onPress={openNameEditor}>
            <Text style={s.rowLabel}>{t('name')}</Text>
            <Text style={s.rowValue}>{username || t('tapToSet')}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('display')}</Text>
          <View style={s.themeRow}>
            <SunIcon color={isDark ? colors.textSecondary : colors.accent} size={20} />
            <View style={s.themeLabel}>
              <Text style={s.themeText}>{t('lightMode')}</Text>
            </View>
            <Switch
              value={!isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={!isDark ? '#fff' : colors.textSecondary}
            />
            <CrescentIcon color={!isDark ? colors.textSecondary : colors.accent} size={20} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings')}</Text>
          <View style={s.langRow}>
            <Text style={s.langLabel}>Bahasa / Language</Text>
            <View style={s.langToggle}>
              <TouchableOpacity
                style={[s.langBtn, lang === 'id' && s.langBtnActive]}
                onPress={() => setLanguage('id')}
              >
                <Text style={[s.langBtnText, lang === 'id' && s.langBtnTextActive]}>ID</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.langBtn, lang === 'en' && s.langBtnActive]}
                onPress={() => setLanguage('en')}
              >
                <Text style={[s.langBtnText, lang === 'en' && s.langBtnTextActive]}>EN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('audioCache')}</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>{t('cacheSize')}</Text>
            <Text style={s.rowValue}>{cacheSize}</Text>
          </View>
          <TouchableOpacity style={s.dangerBtn} onPress={handleClearCache}>
            <Text style={s.dangerBtnText}>{t('clearCache')}</Text>
          </TouchableOpacity>
        </View>

        {profile && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('contentPref')}</Text>
            <Text style={s.hint}>{t('contentHint')}</Text>
            <View style={s.statRow}>
              <Text style={s.statLabel}>{t('hadith')}</Text>
              {getWeightBar(profile.hadithWeight)}
              <Text style={s.statVal}>{profile.hadithWeight.toFixed(1)}</Text>
            </View>
            <View style={s.statRow}>
              <Text style={s.statLabel}>{t('surah')}</Text>
              {getWeightBar(profile.surahWeight)}
              <Text style={s.statVal}>{profile.surahWeight.toFixed(1)}</Text>
            </View>
            <View style={s.statRow}>
              <Text style={s.statLabel}>{t('ceramah')}</Text>
              {getWeightBar(profile.ceramahWeight)}
              <Text style={s.statVal}>{profile.ceramahWeight.toFixed(1)}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>{t('totalInteractions')}</Text>
              <Text style={s.rowValue}>{profile.totalInteractions}</Text>
            </View>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('about')}</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Misykat</Text>
            <Text style={s.rowValue}>v1.0</Text>
          </View>
          <Text style={s.aboutText}>{t('aboutDesc')}</Text>
        </View>
      </ScrollView>

      <Modal visible={showNameModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{t('yourName')}</Text>
            <TextInput
              style={s.modalInput}
              value={tempName}
              onChangeText={setTempName}
              placeholder={t('enterName')}
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity onPress={() => setShowNameModal(false)}>
                <Text style={s.modalCancel}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName}>
                <Text style={s.modalSave}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: c.text, marginBottom: 20, letterSpacing: 0.3 },
  section: {
    backgroundColor: c.card, borderRadius: 16, padding: 20, marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 12 },
  hint: { fontSize: 12, color: c.textSecondary, marginBottom: 12, fontStyle: 'italic' },
  themeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  themeLabel: { flex: 1, marginLeft: 10 },
  themeText: { fontSize: 14, color: c.text, fontWeight: '600' },
  langRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  langLabel: { fontSize: 14, color: c.text, fontWeight: '600' },
  langToggle: { flexDirection: 'row', gap: 4 },
  langBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    backgroundColor: c.borderLight,
  },
  langBtnActive: { backgroundColor: c.accent },
  langBtnText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
  langBtnTextActive: { color: '#fff' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.borderLight,
  },
  rowLabel: { fontSize: 14, color: c.textSecondary },
  rowValue: { fontSize: 14, color: c.text, fontWeight: '600' },
  statRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8,
  },
  statLabel: { fontSize: 13, color: c.textSecondary, width: 70 },
  weightTrack: {
    flex: 1, height: 8, borderRadius: 4, overflow: 'hidden',
  },
  weightFill: {
    height: '100%', borderRadius: 4,
  },
  statVal: { fontSize: 12, color: c.textTertiary, width: 30, textAlign: 'right' },
  dangerBtn: {
    backgroundColor: 'rgba(231,76,60,0.1)', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12,
  },
  dangerBtnText: { color: c.danger, fontSize: 14, fontWeight: '600' },
  aboutText: {
    fontSize: 13, color: c.textSecondary, lineHeight: 20, marginTop: 8, fontStyle: 'italic',
  },
  overlay: {
    flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: c.card, borderRadius: 20, padding: 24, width: '80%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, fontSize: 15,
    color: c.text, backgroundColor: c.bg,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  modalCancel: { fontSize: 14, color: c.textSecondary, fontWeight: '600', padding: 8 },
  modalSave: {
    fontSize: 14, color: '#fff', fontWeight: '700', backgroundColor: c.accent,
    borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10,
  },
});
