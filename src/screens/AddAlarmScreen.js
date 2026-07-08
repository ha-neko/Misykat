import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleAlarm } from '../utils/notifications';
import { ShuffleIcon, ScrollIcon, BookIcon, SpeakerIcon } from '../components/Icons';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

export default function AddAlarmScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const existingAlarm = route.params?.alarm;
  const [hour, setHour] = useState(existingAlarm?.hour ?? 6);
  const [minute, setMinute] = useState(existingAlarm?.minute ?? 0);
  const [label, setLabel] = useState(existingAlarm?.label || '');
  const [contentType, setContentType] = useState('random');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [tempLabel, setTempLabel] = useState(label);

  const contentTypes = [
    { key: 'random', label: t('random'), icon: ShuffleIcon, desc: t('randomDesc') },
    { key: 'hadith', label: t('hadith'), icon: ScrollIcon, desc: t('hadithDesc') },
    { key: 'surah', label: t('surah'), icon: BookIcon, desc: t('surahDesc') },
    { key: 'ceramah', label: t('ceramah'), icon: SpeakerIcon, desc: t('ceramahDesc') },
  ];

  async function handleSave() {
    try {
      await scheduleAlarm({ hour, minute, label, type: 'custom', contentType });
      Alert.alert(t('success'), t('alarmSaved'));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('error'), err.message || t('saveFailed'));
    }
  }

  function inc(n, set, max) { set(v => (v + 1) % max); }
  function dec(n, set, max) { set(v => (v - 1 + max) % max); }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.screenTitle}>{t('newAlarm')}</Text>

        <View style={s.section}>
          <Text style={s.sectionLabel}>{t('time')}</Text>
          <View style={s.pickerRow}>
            <View style={s.pickerCol}>
              <TouchableOpacity onPress={() => inc(hour, setHour, 24)} style={s.arrow}>
                <Text style={s.arrowText}>▲</Text>
              </TouchableOpacity>
              <Text style={s.pickerValue}>{hour.toString().padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => dec(hour, setHour, 24)} style={s.arrow}>
                <Text style={s.arrowText}>▼</Text>
              </TouchableOpacity>
              <Text style={s.pickerUnit}>{t('hour')}</Text>
            </View>
            <Text style={s.pickerSep}>:</Text>
            <View style={s.pickerCol}>
              <TouchableOpacity onPress={() => inc(minute, setMinute, 60)} style={s.arrow}>
                <Text style={s.arrowText}>▲</Text>
              </TouchableOpacity>
              <Text style={s.pickerValue}>{minute.toString().padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => dec(minute, setMinute, 60)} style={s.arrow}>
                <Text style={s.arrowText}>▼</Text>
              </TouchableOpacity>
              <Text style={s.pickerUnit}>{t('minute')}</Text>
            </View>
          </View>
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
                >
                  <Icon color={active ? '#fff' : colors.accent} size={22} />
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

        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
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
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity onPress={() => setShowLabelModal(false)}>
                <Text style={s.modalCancel}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setLabel(tempLabel); setShowLabelModal(false); }}>
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
  screenTitle: { fontSize: 24, fontWeight: '700', color: c.text, marginBottom: 20, letterSpacing: 0.3 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: c.accent, letterSpacing: 1.5, marginBottom: 12 },
  pickerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: c.card, borderRadius: 16, padding: 20 },
  pickerCol: { alignItems: 'center', width: 90 },
  arrow: { padding: 6 },
  arrowText: { fontSize: 14, color: c.accent, fontWeight: '700' },
  pickerValue: {
    fontSize: 40, fontWeight: '700', color: c.text, marginVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  pickerUnit: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  pickerSep: { fontSize: 40, fontWeight: '700', color: c.text, marginHorizontal: 8, marginTop: -10 },
  labelBtn: {
    backgroundColor: c.card, borderRadius: 12, padding: 14,
  },
  labelText: { fontSize: 15, color: c.text },
  labelPlaceholder: { color: c.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    backgroundColor: c.card, borderRadius: 16, padding: 16, alignItems: 'center',
    width: '47%',
  },
  gridActive: { backgroundColor: c.accent },
  gridLabel: { fontSize: 13, fontWeight: '700', color: c.text, marginTop: 8 },
  gridLabelActive: { color: '#fff' },
  gridDesc: { fontSize: 10, color: c.textSecondary, marginTop: 2 },
  gridDescActive: { color: 'rgba(255,255,255,0.7)' },
  saveBtn: {
    backgroundColor: c.accent, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10,
  },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
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
