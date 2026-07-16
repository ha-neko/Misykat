import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import AddAlarmScreen from './src/screens/AddAlarmScreen';
import EditAlarmScreen from './src/screens/EditAlarmScreen';
import PrayerTimesScreen from './src/screens/PrayerTimesScreen';
import AlarmRingingScreen from './src/screens/AlarmRingingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PermissionScreen from './src/screens/PermissionScreen';
import { requestPermissions, getAlarmById } from './src/utils/notifications';
import { getInitialAlarmData, checkPendingAlarm, canScheduleExactAlarm } from './src/utils/nativeAlarm';
import { AlarmIcon, AddIcon, MosqueIcon, SettingsIcon } from './src/components/TabIcons';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider, useLocale } from './src/i18n/LanguageContext';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function AddAlarmWrapper({ navigation, route }) {
  return <AddAlarmScreen navigation={navigation} route={route} />;
}

function TabNavigator() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 65 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabAlarm'),
          tabBarIcon: ({ color, size }) => <AlarmIcon color={color} size={size - 4} />,
        }}
      />
      <Tab.Screen
        name="AddAlarm"
        component={AddAlarmWrapper}
        options={{
          tabBarLabel: t('tabAdd'),
          tabBarIcon: ({ color, size }) => <AddIcon color={color} size={size - 4} />,
        }}
      />
      <Tab.Screen
        name="PrayerTimes"
        component={PrayerTimesScreen}
        options={{
          tabBarLabel: t('tabPrayer'),
          tabBarIcon: ({ color, size }) => <MosqueIcon color={color} size={size - 4} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabSettings'),
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size - 4} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppInner() {
  const { colors, isDark } = useTheme();
  const navigationRef = useRef(null);
  const [navReady, setNavReady] = useState(false);
  const [permDone, setPermDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const pendingAlarm = useRef(null);

  async function goToAlarm(data) {
    if (!data || !data.fromAlarm || !navigationRef.current) return;
    let customSound = null;
    if (data.alarmId) {
      const alarm = await getAlarmById(data.alarmId);
      if (alarm) customSound = alarm.customSound;
    }
    navigationRef.current.navigate('AlarmRinging', {
      contentType: data.contentType,
      isPrayer: data.isPrayer,
      customSound,
    });
  }

  useEffect(() => {
    (async () => {
      const notif = await Notifications.getPermissionsAsync();
      const exact = await canScheduleExactAlarm();
      if (notif.granted && exact) {
        setPermDone(true);
      }
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (permDone) requestPermissions();

    getInitialAlarmData().then(goToAlarm);

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        goToAlarm(response.notification.request.content.data);
      }
    });

    const respSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data) {
        if (navReady) {
          goToAlarm(data);
        } else {
          pendingAlarm.current = data;
        }
      }
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data && navReady) goToAlarm(data);
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        getInitialAlarmData().then(goToAlarm);
      }
    });

    const pendingPoll = setInterval(() => {
      if (navReady) {
        checkPendingAlarm().then(goToAlarm);
      }
    }, 2000);

    return () => {
      respSub.remove();
      receivedSub.remove();
      appStateSub.remove();
      clearInterval(pendingPoll);
    };
  }, [navReady]);

  useEffect(() => {
    if (navReady && pendingAlarm.current) {
      goToAlarm(pendingAlarm.current);
      pendingAlarm.current = null;
    }
  }, [navReady, permDone]);

  if (checking) {
    return (
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </SafeAreaProvider>
    );
  }

  if (!permDone) {
    return (
      <SafeAreaProvider>
        <PermissionScreen onDone={() => setPermDone(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setNavReady(true)}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={TabNavigator} />
        <RootStack.Screen name="EditAlarm" component={EditAlarmScreen} />
        <RootStack.Screen
          name="AlarmRinging"
          component={AlarmRingingScreen}
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
