import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { scheduleAlarm } from '../utils/notifications';
import { ShuffleIcon, ScrollIcon, BookIcon, SpeakerIcon, StarIcon } from '../components/Icons';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

function HoldArrow({ onStep, children, st }) {
  const timer = useRef(null);
  const onPressIn = useCallback(() => {
    onStep();
    timer.current = setInterval(onStep, 120);
  }, [onStep]);
  const onPressOut = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
  return (
    <TouchableOpacity onPress={onStep} onPressIn={onPressIn} onPressOut={onPressOut} style={st.arrow}>
      {children}
    </TouchableOpacity>
  );
}

function TimePicker({ hour, minute, onChange, st }) {
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');

  function startEdit(field) {
    setEditing(field);
    setEditVal(field === 'hour' ? hour.toString() : minute.toString().padStart(2, '0'));
  }

  function finishEdit() {
    const val = parseInt(editVal, 10);
    if (!isNaN(val)) {
      if (editing === 'hour') onChange(Math.max(0, Math.min(23, val)), minute);
      else onChange(hour, Math.max(0, Math.min(59, val)));
    }
    setEditing(null);
    Keyboard.dismiss();
  }

  return (
    <View style={st.pickerRow}>
      <View style={st.pickerCol}>
        <HoldArrow onStep={() => onChange((hour + 1) % 24, minute)} st={st}>
          <Text style={st.arrowText}>▲</Text>
        </HoldArrow>
        {editing === 'hour' ? (
          <TextInput
            style={st.pickerInput}
            value={editVal}
            onChangeText={setEditVal}
            keyboardType="number-pad"
            selectTextOnFocus
            autoFocus
            onBlur={finishEdit}
            onSubmitEditing={finishEdit}
            maxLength={2}
          />
        ) : (
          <TouchableOpacity onPress={() => startEdit('hour')}>
            <Text style={st.pickerValue}>{hour.toString().padStart(2, '0')}</Text>
          </TouchableOpacity>
        )}
        <HoldArrow onStep={() => onChange((hour - 1 + 24) % 24, minute)} st={st}>
          <Text style={st.arrowText}>▼</Text>
        </HoldArrow>
      </View>
      <Text style={st.pickerSep}>:</Text>
      <View style={st.pickerCol}>
        <HoldArrow onStep={() => onChange(hour, (minute + 1) % 60)} st={st}>
          <Text style={st.arrowText}>▲</Text>
        </HoldArrow>
        {editing === 'minute' ? (
          <TextInput
            style={st.pickerInput}
            value={editVal}
            onChangeText={setEditVal}
            keyboardType="number-pad"
            selectTextOnFocus
            autoFocus
            onBlur={finishEdit}
            onSubmitEditing={finishEdit}
            maxLength={2}
          />
        ) : (
          <TouchableOpacity onPress={() => startEdit('minute')}>
            <Text style={st.pickerValue}>{minute.toString().padStart(2, '0')}</Text>
          </TouchableOpacity>
        )}
        <HoldArrow onStep={() => onChange(hour, (minute - 1 + 60) % 60)} st={st}>
          <Text style={st.arrowText}>▼</Text>
        </HoldArrow>
      </View>
    </View>
  );
}

export default function AddAlarmScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(0);
  const [label, setLabel] = useState('');
  const [contentType, setContentType] = useState('random');
  const [customSound, setCustomSound] = useState(null);
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
      await scheduleAlarm({ hour, minute, label, type: 'custom', contentType, customSound: customSound?.uri || null });
      Alert.alert(t('success'), t('alarmSaved'));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('error'), err.message || t('saveFailed'));
    }
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.screenTitle}>{t('newAlarm')}</Text>
        <View style={s.backBtn} />
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
                  <Text style={[s.gridLabel, active && s.gridLabelActive]}>
                    {ct.label}
                  </Text>
                  <Text style={[s.gridDesc, active && s.gridDescActive]}>
                    {ct.desc}
                  </Text>
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

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={s.saveBtnText}>{t('saveAlarm')}</Text>
        </TouchableOpacity>
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
  saveBtn: {
    backgroundColor: c.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  saveBtnText: { fontSize: 15, color: c.onPrimary, fontWeight: '600', letterSpacing: 0.3 },
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
