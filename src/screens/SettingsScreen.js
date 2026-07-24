import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
  TextInput, Modal, Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAudioCache, getCacheSize } from '../utils/cacheManager';
import { getUserProfile } from '../utils/recommendation';
import { getErrors, clearErrors, formatReport } from '../utils/errorLog';
import AppLogo from '../components/AppLogo';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';
import { SunIcon, CrescentIcon, GlobeIcon, PencilIcon, WarningIcon } from '../components/Icons';

const USERNAME_KEY = 'app_username';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, lang, setLanguage } = useLocale();
  const [cacheSize, setCacheSize] = useState('0 B');
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [errorLog, setErrorLog] = useState([]);

  useEffect(() => { loadInfo(); }, []);

  // refresh errors every time Settings tab is focused
  useFocusEffect(
    useCallback(() => {
      setErrorLog(getErrors());
    }, [])
  );

  async function loadInfo() {
    try {
      const p = await getUserProfile();
      setProfile(p);
      const name = await AsyncStorage.getItem(USERNAME_KEY);
      if (name) setUsername(name);

      const total = await getCacheSize();
      setCacheSize(total > 1048576 ? `${(total / 1048576).toFixed(1)} MB` : `${(total / 1024).toFixed(0)} KB`);
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
    try {
      await clearAudioCache();
      setCacheSize('0 B');
      Alert.alert(t('success'), t('cacheCleared'));
    } catch {
      Alert.alert(t('error'), t('cacheClearFailed'));
    }
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topDecoration}>
        <View style={s.decoDot} />
        <View style={s.decoDot} />
        <View style={s.decoDot} />
      </View>
      <View style={s.appBar}>
        <Text style={s.screenTitle}>{t('settings')}</Text>
        <AppLogo size={22} color={colors.primary} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text style={s.sectionHeader}>{t('profile')}</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={openNameEditor} activeOpacity={0.7}>
            <Text style={s.rowLabel}>{t('username')}</Text>
            <View style={s.rowRight}>
              <Text style={[s.rowValue, !username && s.rowPlaceholder]}>
                {username || t('setUsername')}
              </Text>
              <PencilIcon color={colors.outline} size={16} />
            </View>
          </TouchableOpacity>

          {profile && (
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statValue}>{profile.totalRecommended}</Text>
                <Text style={s.statLabel}>{t('recommended')}</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statValue}>{profile.totalEngaged}</Text>
                <Text style={s.statLabel}>{t('engaged')}</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statValue}>{profile.totalSkipped}</Text>
                <Text style={s.statLabel}>{t('skipped')}</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={s.sectionHeader}>{t('appearance')}</Text>
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <View style={s.iconWrap}>
                {isDark ? <CrescentIcon color={colors.primary} size={18} /> : <SunIcon color={colors.primary} size={18} />}
              </View>
              <View>
                <Text style={s.rowLabel}>{t('theme')}</Text>
                <Text style={s.rowHint}>{isDark ? t('dark') : t('light')}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
              thumbColor={isDark ? colors.primary : colors.onSurfaceVariant}
            />
          </View>

          <View style={s.divider} />

          <View style={s.row}>
            <View style={s.rowLeft}>
              <View style={s.iconWrap}>
                <GlobeIcon color={colors.primary} size={18} />
              </View>
              <View>
                <Text style={s.rowLabel}>{t('language')}</Text>
                <Text style={s.rowHint}>{lang === 'id' ? 'Indonesia' : 'English'}</Text>
              </View>
            </View>
            <Switch
              value={lang === 'en'}
              onValueChange={(v) => setLanguage(v ? 'en' : 'id')}
              trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
              thumbColor={lang === 'en' ? colors.primary : colors.onSurfaceVariant}
            />
          </View>
        </View>

        <Text style={s.sectionHeader}>{t('storage')}</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>{t('audioCache')}</Text>
            <Text style={s.rowValue}>{cacheSize}</Text>
          </View>
          <TouchableOpacity style={s.actionBtn} onPress={handleClearCache} activeOpacity={0.7}>
            <Text style={s.actionBtnText}>{t('clearCache')}</Text>
          </TouchableOpacity>
        </View>

        {errorLog.length > 0 && (
          <>
            <Text style={s.sectionHeader}>
              {t('errorLog')} ({errorLog.length} {t('errorCount')})
            </Text>
            <View style={s.card}>
              <TouchableOpacity
                style={s.errorRow}
                onPress={() => {
                  const report = formatReport();
                  Share.share({ message: report, title: 'Misykat Error Report' });
                }}
                activeOpacity={0.7}
              >
                <View style={s.rowLeft}>
                  <View style={[s.iconWrap, { backgroundColor: '#3a1a1a' }]}>
                    <WarningIcon color="#ff6b6b" size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>{t('reportToDev')}</Text>
                    <Text style={s.rowHint}>{t('reportHint')}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: '#ff6b6b', fontWeight: '600' }}>
                  {errorLog.length}
                </Text>
              </TouchableOpacity>

              <View style={s.divider} />

              {/* latest error preview */}
              <View style={s.errorPreview}>
                <Text style={s.errorTime}>
                  {new Date(errorLog[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={s.errorMsg} numberOfLines={2}>
                  {errorLog[0].message}
                </Text>
              </View>

              {errorLog.length > 1 && (
                <>
                  <View style={s.divider} />
                  <TouchableOpacity
                    style={s.showAllBtn}
                    onPress={() => {
                      const report = formatReport();
                      Share.share({ message: report, title: 'Misykat Error Report' });
                    }}
                  >
                    <Text style={s.showAllText}>
                      Lihat semua {errorLog.length} error
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={s.divider} />

              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#2a1010' }]}
                onPress={async () => {
                  await clearErrors();
                  refreshErrors();
                  Alert.alert(t('success'), t('errorsCleared'));
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.actionBtnText, { color: '#ff6b6b' }]}>{t('clearErrors')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={s.sectionHeader}>{t('about')}</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>{t('version')}</Text>
            <Text style={s.rowValue}>1.0.0</Text>
          </View>
        </View>

        <View style={s.footer}>
          <AppLogo size={20} color={colors.outline} />
          <Text style={s.footerText}>Misykat</Text>
        </View>
      </ScrollView>

      <Modal visible={showNameModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{t('username')}</Text>
            <TextInput
              style={s.modalInput}
              value={tempName}
              onChangeText={setTempName}
              placeholder={t('setUsername')}
              placeholderTextColor={colors.outline}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity onPress={() => setShowNameModal(false)} style={s.modalBtn}>
                <Text style={s.modalBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} style={s.modalSaveBtn}>
                <Text style={s.modalSaveText}>{t('save')}</Text>
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
  topDecoration: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 4, paddingBottom: 2,
  },
  decoDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent, opacity: 0.3,
  },
  appBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  screenTitle: { fontSize: 22, fontWeight: '700', color: c.onSurface },
  scroll: { paddingBottom: 40 },
  sectionHeader: {
    fontSize: 11, fontWeight: '600', color: c.primary, letterSpacing: 1.2,
    marginTop: 8, marginBottom: 8, paddingHorizontal: 16, textTransform: 'uppercase',
  },
  card: {
    backgroundColor: c.surface, borderRadius: 16, marginHorizontal: 16, marginBottom: 8,
    paddingVertical: 4,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, minHeight: 48,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: c.primaryContainer, justifyContent: 'center', alignItems: 'center',
  },
  rowLabel: { fontSize: 15, color: c.onSurface, fontWeight: '500' },
  rowHint: { fontSize: 12, color: c.onSurfaceVariant, marginTop: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 14, color: c.onSurfaceVariant },
  rowPlaceholder: { color: c.outline, fontStyle: 'italic' },

  divider: { height: 1, backgroundColor: c.borderLight, marginHorizontal: 16 },
  statsRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.borderLight,
    marginTop: 4, paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: c.primary },
  statLabel: { fontSize: 11, color: c.onSurfaceVariant, marginTop: 2 },
  langBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langText: { fontSize: 14, color: c.primary, fontWeight: '500' },
  errorRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, minHeight: 48,
  },
  errorPreview: {
    paddingVertical: 10, paddingHorizontal: 16,
  },
  errorTime: {
    fontSize: 11, color: c.onSurfaceVariant, fontWeight: '600', marginBottom: 4,
  },
  errorMsg: {
    fontSize: 13, color: '#ff6b6b', lineHeight: 18, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  showAllBtn: {
    paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center',
  },
  showAllText: {
    fontSize: 13, color: c.primary, fontWeight: '600',
  },
  actionBtn: {
    marginHorizontal: 16, marginBottom: 12, padding: 12,
    backgroundColor: c.errorContainer, borderRadius: 10, alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, color: c.onErrorContainer, fontWeight: '600' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 24, gap: 8, opacity: 0.5,
  },
  footerText: { fontSize: 13, color: c.outline, fontWeight: '500' },
  overlay: {
    flex: 1, backgroundColor: c.scrim + '60', justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: c.surface, borderRadius: 24, padding: 24, width: '82%',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: c.onSurface, marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderColor: c.outlineVariant, borderRadius: 12, padding: 14, fontSize: 15,
    color: c.onSurface, backgroundColor: c.bg,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 8 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  modalBtnText: { fontSize: 14, color: c.onSurfaceVariant, fontWeight: '500' },
  modalSaveBtn: {
    backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
  },
  modalSaveText: { fontSize: 14, color: c.onPrimary, fontWeight: '600' },
});
