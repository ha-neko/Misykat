import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import {
  canUseFullScreenIntent,
  openFullScreenIntentSettings,
  canScheduleExactAlarm,
  isIgnoringBatteryOptimizations,
  openBatteryOptimizationSettings,
} from '../utils/nativeAlarm';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';
import AppLogo from '../components/AppLogo';

const PERMISSION_STEPS = [
  {
    key: 'notif',
    title: 'Notifikasi',
    description: 'Untuk menampilkan alarm saat aplikasi sedang berjalan',
  },
  {
    key: 'exact',
    title: 'Izin Alarm Tepat',
    description: 'Agar alarm dapat berbunyi tepat waktu tanpa ditunda sistem',
  },
  {
    key: 'fsi',
    title: 'Izin Layar Penuh',
    description: 'Agar alarm muncul di layar kunci dan menimpa aplikasi lain',
    note: 'Jika tombol tidak merespon, buka Setelan > Aplikasi > Misykat > Alarm & Pengingat & izinkan',
  },
  {
    key: 'battery',
    title: 'Optimasi Baterai',
    description: 'Agar sistem tidak menunda alarm di perangkat Samsung/Xiaomi/OPPO',
    note: 'Pilih "Tidak dioptimalkan" pada halaman berikut',
  },
];

export default function PermissionScreen({ onDone }) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [permissions, setPermissions] = useState({
    notif: false,
    exact: false,
    fsi: false,
    battery: false,
  });

  useEffect(() => { checkAll(); }, []);

  async function checkAll() {
    const notifStatus = await Notifications.getPermissionsAsync();
    const exact = await canScheduleExactAlarm();
    const fsi = await canUseFullScreenIntent();
    const battery = await isIgnoringBatteryOptimizations();
    setPermissions({
      notif: notifStatus.granted,
      exact,
      fsi,
      battery,
    });
  }

  async function requestNotification() {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissions(prev => ({ ...prev, notif: status === 'granted' }));
  }

  async function requestExactAlarm() {
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.REQUEST_SCHEDULE_EXACT_ALARM_PERMISSION',
        { data: 'package:com.misykat.alarm' }
      );
    } catch {
      Linking.openSettings();
    }
    await sleep(800);
    const granted = await canScheduleExactAlarm();
    setPermissions(prev => ({ ...prev, exact: granted }));
    if (!granted) {
      Alert.alert(
        t('permissionRequired'),
        'Izin Alarm Tepat belum diberikan. Buka Setelan > Aplikasi > Misykat > Alarm & Pengingat & izinkan.'
      );
    }
  }

  async function requestFSI() {
    const supported = await canUseFullScreenIntent();
    if (supported) {
      setPermissions(prev => ({ ...prev, fsi: true }));
      return;
    }
    try {
      await openFullScreenIntentSettings();
      await sleep(800);
      const granted = await canUseFullScreenIntent();
      setPermissions(prev => ({ ...prev, fsi: granted }));
      if (!granted) {
        showManualFSIAlert();
      }
    } catch {
      showManualFSIAlert();
    }
  }

  function showManualFSIAlert() {
    Alert.alert(
      t('fsiSettings'),
      t('fsiInstructions') + '\n\n' + t('fsiManualSteps'),
      [
        { text: t('openSettings'), onPress: () => Linking.openSettings() },
        { text: t('alreadyDone'), onPress: () => { setPermissions(prev => ({ ...prev, fsi: true })); checkAll(); } },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  }

  async function requestBattery() {
    try {
      await openBatteryOptimizationSettings();
      await sleep(1000);
      const granted = await isIgnoringBatteryOptimizations();
      setPermissions(prev => ({ ...prev, battery: granted }));
      if (!granted) {
        Alert.alert(
          'Optimasi Baterai',
          'Buka Setelan > Aplikasi > Misykat > Baterai > Pilih "Tidak dioptimalkan" agar alarm tidak ditunda.'
        );
      }
    } catch {
      Alert.alert('Optimasi Baterai', 'Buka Setelan > Aplikasi > Misykat > Baterai > Pilih "Tidak dioptimalkan".');
      setPermissions(prev => ({ ...prev, battery: true }));
    }
  }

  function handleContinue() {
    if (!permissions.notif || !permissions.exact || !permissions.fsi) {
      Alert.alert(t('permissionRequired'), t('grantAllPermissions'));
      return;
    }
    onDone();
  }

  const allGranted = permissions.notif && permissions.exact && permissions.fsi;

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style={colors.statusBar} />
      <View style={s.content}>
        <View style={s.logoWrap}>
          <AppLogo size={40} color={colors.primary} />
        </View>
        <Text style={s.title}>{t('permissionRequired')}</Text>
        <Text style={s.subtitle}>{t('permissionDesc')}</Text>

        <View style={s.stepsList}>
          {PERMISSION_STEPS.map((step) => (
            <View key={step.key} style={[s.step, permissions[step.key] && s.stepDone]}>
              <View style={s.stepHeader}>
                <Text style={[s.stepNum, permissions[step.key] && s.stepNumDone]}>
                  {permissions[step.key] ? '\u2713' : String(PERMISSION_STEPS.indexOf(step) + 1)}
                </Text>
                <View style={s.stepContent}>
                  <Text style={[s.stepTitle, permissions[step.key] && s.stepTitleDone]}>
                    {step.title}
                  </Text>
                  <Text style={s.stepDesc}>{step.description}</Text>
                  {step.note && (
                    <Text style={s.stepNote}>{step.note}</Text>
                  )}
                </View>
              </View>
              {!permissions[step.key] && (
                <TouchableOpacity
                  style={s.grantBtn}
                  onPress={() => {
                    if (step.key === 'notif') requestNotification();
                    else if (step.key === 'exact') requestExactAlarm();
                    else if (step.key === 'fsi') requestFSI();
                    else if (step.key === 'battery') requestBattery();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.grantBtnText}>{t('grant')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[s.continueBtn, allGranted && s.continueBtnReady]}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={[s.continueText, allGranted && s.continueTextReady]}>
            {allGranted ? t('continue') : t('grantAllFirst')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  logoWrap: { alignItems: 'center', marginVertical: 8 },
  title: { fontSize: 22, fontWeight: '700', color: c.onSurface, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: c.onSurfaceVariant, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  stepsList: { gap: 8, flex: 1 },
  step: {
    backgroundColor: c.surface, borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  stepDone: { backgroundColor: c.primaryContainer, borderWidth: 1, borderColor: c.primary, opacity: 0.75 },
  stepHeader: { flexDirection: 'row', gap: 14 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: c.primaryContainer, color: c.primary,
    textAlign: 'center', lineHeight: 28, fontSize: 14, fontWeight: '600',
    overflow: 'hidden',
  },
  stepNumDone: { backgroundColor: c.primary, color: c.onPrimary },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, color: c.onSurface, fontWeight: '600', marginBottom: 2 },
  stepTitleDone: { color: c.onPrimaryContainer },
  stepDesc: { fontSize: 12, color: c.onSurfaceVariant, lineHeight: 16 },
  stepNote: { fontSize: 10, color: c.error, marginTop: 6, fontStyle: 'italic', lineHeight: 14 },
  grantBtn: {
    marginTop: 12, backgroundColor: c.primary, borderRadius: 10, padding: 12, alignItems: 'center',
  },
  grantBtnText: { color: c.onPrimary, fontSize: 13, fontWeight: '600' },
  continueBtn: {
    backgroundColor: c.surface, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: c.outlineVariant, opacity: 0.5,
  },
  continueBtnReady: { opacity: 1, backgroundColor: c.primary, borderColor: c.primary },
  continueText: { fontSize: 14, color: c.outline, fontWeight: '600' },
  continueTextReady: { color: c.onPrimary },
});
