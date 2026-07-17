import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getAlarms, deleteAlarm } from '../utils/notifications';
import { scheduleNativeAlarm, cancelNativeAlarm } from '../utils/nativeAlarm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShuffleIcon, ScrollIcon, BookIcon, SpeakerIcon, StarIcon } from '../components/Icons';
import TimePicker from '../components/TimePicker';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

const ALARMS_KEY = 'alarms';

export default function EditAlarmScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const existing = route.params?.alarm;

  const [hour, setHour] = useState(existing?.hour ?? 6);
  const [minute, setMinute] = useState(existing?.minute ?? 0);
  const [label, setLabel] = useState(existing?.label ?? '');
  const [contentType, setContentType] = useState(existing?.contentType ?? 'random');
  const [customSound, setCustomSound] = useState(existing?.customSound ? { name: existing.customSound.split('/').pop(), uri: existing.customSound } : null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [tempLabel, setTempLabel] = useState(label);

  const contentTypes = [
    { key: 'random', label: t('random'), icon: ShuffleIcon, desc: t('randomDesc') },
    { key: 'hadith', label: t('hadith'), icon: ScrollIcon, desc: t('hadithDesc') },
    { key: 'surah', label: t('surah'), icon: BookIcon, desc: t('surahDesc') },
    { key: 'ceramah', label: t('ceramah'), icon: SpeakerIcon, desc: t('ceramahDesc') },
  ];

  async function pickSound() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const localUri = FileSystem.documentDirectory + 'custom_sounds/' + asset.name;
        await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'custom_sounds/', { intermediates: true });
        await FileSystem.copyAsync({ from: asset.uri, to: localUri });
        setCustomSound({ name: asset.name, uri: localUri });
      }
    } catch {}
  }

  async function handleSave() {
    try {
      if (existing) {
        await cancelNativeAlarm(existing.id);
        await scheduleNativeAlarm(hour, minute, existing.id, contentType, false);
        const all = await getAlarms();
        const idx = all.findIndex(a => a.id === existing.id);
        if (idx !== -1) {
          all[idx] = { ...all[idx], hour, minute, label, contentType, customSound: customSound?.uri || null };
          await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(all));
        }
      }
      Alert.alert(t('success'), t('alarmSaved'));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('error'), err.message || t('saveFailed'));
    }
  }

  async function handleDelete() {
    Alert.alert(t('deleteTitle'), t('deleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: async () => {
          if (existing) {
            await deleteAlarm(existing.id);
          }
          navigation.goBack();
        },
      },
    ]);
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.screenTitle}>{t('editAlarm')}</Text>
        <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
          <Text style={s.deleteText}>{t('delete')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('time')}</Text>
          <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} st={s} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('label')}</Text>
          <TouchableOpacity style={s.labelBtn} onPress={() => { setTempLabel(label); setShowLabelModal(true); }}>
            <Text style={[s.labelText, !label && s.labelPlaceholder]}>
              {label || t('alarmName')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('content')}</Text>
          <View style={s.grid}>
            {contentTypes.map((ct) => {
              const active = contentType === ct.key;
              const Icon = ct.icon;
              return (
                <TouchableOpacity
                  key={ct.key}
                  style={[s.gridItem, active && s.gridActive]}
                  onPress={() => setContentType(ct.key)}
                  activeOpacity={0.7}
                >
                  <View style={[s.gridIconWrap, active && s.gridIconActive]}>
                    <Icon color={active ? colors.onPrimary : colors.primary} size={20} />
                  </View>
                  <Text style={[s.gridLabel, active && s.gridLabelActive]}>{ct.label}</Text>
                  <Text style={[s.gridDesc, active && s.gridDescActive]}>{ct.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('soundLabel')}</Text>
          <TouchableOpacity style={s.soundBtn} onPress={pickSound} activeOpacity={0.7}>
            <View style={s.soundLeft}>
              <StarIcon color={colors.primary} size={14} />
              <Text style={[s.soundText, !customSound && s.soundPlaceholder]}>
                {customSound ? customSound.name : t('defaultSound')}
              </Text>
            </View>
            <Text style={s.soundArrow}>↻</Text>
          </TouchableOpacity>
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={s.saveBtnText}>{t('saveAlarm')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtnWide} onPress={handleDelete} activeOpacity={0.7}>
            <Text style={s.deleteBtnText}>{t('deleteAlarm')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showLabelModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{t('alarmTitle')}</Text>
            <TextInput
              style={s.modalInput}
              value={tempLabel}
              onChangeText={setTempLabel}
              placeholder={t('alarmName')}
              placeholderTextColor={colors.outline}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity onPress={() => setShowLabelModal(false)} style={s.modalBtn}>
                <Text style={s.modalBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setLabel(tempLabel); setShowLabelModal(false); }}
                style={s.modalSaveBtn}
              >
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
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 8, backgroundColor: c.surface,
  },
  backBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: c.onSurface },
  screenTitle: { fontSize: 18, fontWeight: '600', color: c.onSurface, letterSpacing: 0.2 },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  deleteText: { fontSize: 14, color: c.error, fontWeight: '500' },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: c.primary, letterSpacing: 1.2,
    marginBottom: 10, textTransform: 'uppercase',
  },
  pickerRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: c.surface, borderRadius: 16, padding: 24,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  pickerCol: { alignItems: 'center', width: 100 },
  arrow: { padding: 6, borderRadius: 8 },
  arrowText: { fontSize: 14, color: c.primary, fontWeight: '600' },
  pickerValue: {
    fontSize: 48, fontWeight: '300', color: c.onSurface, marginVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  pickerInput: {
    fontSize: 48, fontWeight: '300', color: c.onSurface,
    fontVariant: ['tabular-nums'], width: '100%', textAlign: 'center',
    padding: 0, margin: 0, height: 56,
  },
  pickerSep: { fontSize: 48, fontWeight: '300', color: c.outline, marginHorizontal: 4, marginTop: -4 },
  labelBtn: {
    backgroundColor: c.surface, borderRadius: 12, padding: 16,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  labelText: { fontSize: 15, color: c.onSurface },
  labelPlaceholder: { color: c.outline },
  soundBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.surface, borderRadius: 12, padding: 14,
  },
  soundLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  soundText: { fontSize: 14, color: c.onSurface },
  soundPlaceholder: { color: c.outline },
  soundArrow: { fontSize: 16, color: c.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: {
    backgroundColor: c.surface, borderRadius: 16, padding: 16, alignItems: 'center',
    width: '47%',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  gridActive: { backgroundColor: c.primary },
  gridIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: c.primaryContainer, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  gridIconActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  gridLabel: { fontSize: 13, fontWeight: '600', color: c.onSurface, marginTop: 4 },
  gridLabelActive: { color: c.onPrimary },
  gridDesc: { fontSize: 10, color: c.onSurfaceVariant, marginTop: 2, textAlign: 'center' },
  gridDescActive: { color: 'rgba(255,255,255,0.7)' },
  actions: { gap: 12, marginTop: 8 },
  saveBtn: {
    backgroundColor: c.primary, borderRadius: 14, padding: 16, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  saveBtnText: { fontSize: 15, color: c.onPrimary, fontWeight: '600', letterSpacing: 0.3 },
  deleteBtnWide: {
    borderRadius: 14, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: c.error, backgroundColor: c.errorContainer,
  },
  deleteBtnText: { fontSize: 14, color: c.onErrorContainer, fontWeight: '600' },
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
