import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { useTheme } from '../theme/ThemeContext';
import AppLogo from '../components/AppLogo';

const PERM_KEY = 'perm_granted';

const steps = [
  {
    key: 'notif',
    title: 'Notifikasi & Alarm',
    desc: 'Untuk menampilkan alarm tepat waktu dan muncul di layar kunci',
    request: async () => {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: true },
        android: { channelId: 'alarm' },
      });
      return status === 'granted';
    },
  },
  {
    key: 'fsi',
    title: 'Izin Layar Penuh',
    desc: 'Agar alarm otomatis muncul tanpa perlu mengetuk notifikasi',
    request: async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          const PermissionsAndroid = require('react-native').PermissionsAndroid;
          const result = await PermissionsAndroid.request('android.permission.USE_FULL_SCREEN_INTENT');
          return result === 'granted';
        } catch {
          return false;
        }
      }
      return true;
    },
  },
  {
    key: 'exact',
    title: 'Alarm Tepat Waktu',
    desc: 'Agar alarm aktif di jam yang akurat meski HP dalam mode hemat baterai',
    request: async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          const PermissionsAndroid = require('react-native').PermissionsAndroid;
          const result = await PermissionsAndroid.request('android.permission.SCHEDULE_EXACT_ALARM');
          return result === 'granted';
        } catch {
          return false;
        }
      }
      return true;
    },
  },
  {
    key: 'location',
    title: 'Lokasi',
    desc: 'Untuk menentukan jadwal sholat sesuai posisi Anda',
    request: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    },
  },
];

export default function PermissionScreen({ onDone }) {
  const { colors } = useTheme();
  const [stepIdx, setStepIdx] = useState(0);
  const [results, setResults] = useState({});
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PERM_KEY).then((v) => {
      if (v === 'true') onDone();
    });
  }, []);

  const step = steps[stepIdx];
  const isLast = stepIdx >= steps.length - 1;
  const granted = results[step?.key];

  async function handleRequest() {
    if (requesting) return;
    setRequesting(true);
    const ok = await step.request();
    setResults((prev) => ({ ...prev, [step.key]: ok }));
    setRequesting(false);
  }

  function handleNext() {
    if (isLast) {
      AsyncStorage.setItem(PERM_KEY, 'true').then(onDone);
    } else {
      setStepIdx((i) => i + 1);
    }
  }

  function handleSkip() {
    if (isLast) {
      AsyncStorage.setItem(PERM_KEY, 'true').then(onDone);
    } else {
      setStepIdx((i) => i + 1);
    }
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <View style={s.logoWrap}>
          <AppLogo size={72} color={colors.accent} />
        </View>

        <Text style={s.title}>Misykat</Text>
        <Text style={s.subtitle}>Bangun dengan Cahaya Islam</Text>

        <View style={s.stepsIndicator}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i === stepIdx && s.dotActive,
                results[steps[i]?.key] && s.dotDone,
              ]}
            />
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.stepTitle}>{step.title}</Text>
          <Text style={s.stepDesc}>{step.desc}</Text>

          {granted === true ? (
            <View style={s.grantedBadge}>
              <Text style={s.grantedText}>✓ Diizinkan</Text>
            </View>
          ) : granted === false ? (
            <View style={s.deniedBadge}>
              <Text style={s.deniedText}>✕ Ditolak</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.permBtn, requesting && s.permBtnDisabled]}
            onPress={handleRequest}
            disabled={requesting}
          >
            <Text style={s.permBtnText}>
              {requesting ? 'Meminta...' : granted ? 'Minta Ulang' : 'Izinkan'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.nextBtn} onPress={granted ? handleNext : handleSkip}>
          <Text style={s.nextText}>
            {isLast ? 'Mulai' : granted === true ? 'Lanjut' : 'Lewati'}
          </Text>
        </TouchableOpacity>

        <Text style={s.hint}>
          Anda bisa mengubah izin kapan saja di Pengaturan > Aplikasi > Misykat
        </Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logoWrap: { marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: c.textSecondary, marginTop: 4, marginBottom: 32 },
  stepsIndicator: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.border },
  dotActive: { backgroundColor: c.accent, width: 28, borderRadius: 5 },
  dotDone: { backgroundColor: c.accent, opacity: 0.5 },
  card: {
    backgroundColor: c.card, borderRadius: 20, padding: 28, width: '100%',
    alignItems: 'center', borderWidth: 1, borderColor: c.border,
  },
  stepTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 8 },
  stepDesc: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  grantedBadge: {
    backgroundColor: 'rgba(0,184,148,0.15)', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginBottom: 16,
  },
  grantedText: { color: '#00b894', fontWeight: '700', fontSize: 13 },
  deniedBadge: {
    backgroundColor: 'rgba(231,76,60,0.12)', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginBottom: 16,
  },
  deniedText: { color: c.danger, fontWeight: '700', fontSize: 13 },
  permBtn: {
    backgroundColor: c.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40,
  },
  permBtnDisabled: { opacity: 0.6 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nextBtn: { marginTop: 24, padding: 12 },
  nextText: { color: c.accent, fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 11, color: c.textTertiary, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
