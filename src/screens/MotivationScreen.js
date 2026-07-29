import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, StatusBar,
  Dimensions, Image, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const STATUSBAR = StatusBar.currentHeight || 30;

export default function MotivationScreen() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" translucent={false} backgroundColor="#000" />
      {loaded ? (
        <Text style={s.text}>Motivasi</Text>
      ) : (
        <ActivityIndicator size="large" color="rgba(255,255,255,0.4)" />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, color: '#fff', fontWeight: '600' },
  placeholder: { color: 'rgba(255,255,255,0.2)', fontSize: 14, marginTop: 16 },
});
