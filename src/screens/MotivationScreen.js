import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, StatusBar,
  Dimensions, Image, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DownloadIcon, BookmarkIcon, BookmarkFillIcon } from '../components/Icons';
import {
  getCategories, getCategoryLabel,
  getFavIds, toggleFavorite,
  getFavorites, fetchBatch,
  isFav, getCacheSize,
} from '../utils/motivations';

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
        <View style={s.inner}>
          <Text style={s.text}>Motivasi</Text>
          <BookmarkIcon size={24} color="rgba(255,255,255,0.5)" />
        </View>
      ) : (
        <ActivityIndicator size="large" color="rgba(255,255,255,0.4)" />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  inner: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  text: { fontSize: 24, color: '#fff', fontWeight: '600' },
});
