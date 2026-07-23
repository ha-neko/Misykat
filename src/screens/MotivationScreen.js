import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, StatusBar,
  Dimensions, Image, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import {
  getCategories, getCategoryLabel,
  getFavIds, toggleFavorite,
  markSeen, resetSeen, fetchBatch, fetchOne,
  getCachedVerse,
} from '../utils/motivations';
import { BookmarkIcon, BookmarkFillIcon, DownloadIcon } from '../components/Icons';
import { useLocale } from '../i18n/LanguageContext';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const PAGE_SIZE = 6;

const KEYWORDS = {
  pekerjaan: 'business,office,architecture,city',
  keluarga: 'family,home,people,nature',
  umum: 'nature,life,landscape,mountain',
  ibadah: 'mosque,light,stars,sky',
};

function getWallpaperUrl(item, w, h) {
  const kw = KEYWORDS[item.cat] || 'nature';
  const terms = kw.split(',');
  const base = terms[Math.abs(item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % terms.length];
  const width = w || Math.round(SCREEN_W);
  const height = h || Math.round(SCREEN_H);
  return `https://picsum.photos/seed/${base}-${item.id}/${width}/${height}`;
}

export default function MotivationScreen() {
  const { t } = useLocale();
  const cats = getCategories();
  const listRef = useRef(null);
  const loadingRef = useRef(false);

  const [activeTab, setActiveTab] = useState('pekerjaan');
  const [items, setItems] = useState([]);
  const [favIds, setFavIdsState] = useState(new Set());
  const [favItems, setFavItems] = useState([]);
  const [loadingImg, setLoadingImg] = useState({});

  useEffect(() => { loadFavs(); }, []);

  // init pool when tab changes
  useEffect(() => {
    if (activeTab === '_fav') return;
    (async () => {
      loadingRef.current = false;
      resetSeen();
      setItems([]);
      const batch = await fetchBatch(activeTab, PAGE_SIZE);
      batch.forEach(v => markSeen(v.id));
      setItems(batch);
    })();
  }, [activeTab]);

  // preload images
  useEffect(() => {
    items.forEach(i => Image.prefetch(getWallpaperUrl(i)));
  }, [items]);

  async function loadMore() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const verse = await fetchOne(activeTab);
      if (verse) {
        markSeen(verse.id);
        setItems(prev => [...prev, verse]);
      }
    } finally {
      loadingRef.current = false;
    }
  }

  function handleScroll(e) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distFromEnd = contentSize.height - contentOffset.y - layoutMeasurement.height;
    if (distFromEnd < SCREEN_H * 0.4 && !loadingRef.current) {
      loadMore();
    }
  }

  async function loadFavs() {
    const ids = await getFavIds();
    setFavIdsState(new Set(ids));
    // resolve cached items for display
    const resolved = ids.map(id => getCachedVerse(id)).filter(Boolean);
    setFavItems(resolved);
  }

  async function handleFav(id) {
    await toggleFavorite(id);
    await loadFavs();
  }

  async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function handleDownload(item) {
    try {
      setLoadingImg(prev => ({ ...prev, [item.id]: true }));

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error'), 'Izin penyimpanan ditolak');
        return;
      }

      const url = getWallpaperUrl(item, 720, 1280);
      const filename = `misykat-${item.id}.jpg`;
      const dest = FileSystem.documentDirectory + filename;

      let savedUri;
      try {
        const dl = await FileSystem.downloadAsync(url, dest);
        savedUri = dl.uri;
      } catch {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36' },
        });
        const blob = await response.blob();
        const b64 = await blobToBase64(blob);
        await FileSystem.writeAsStringAsync(dest, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        savedUri = dest;
      }

      const asset = await MediaLibrary.createAssetAsync(savedUri);
      await MediaLibrary.createAlbumAsync('Misykat', asset, false);
      Alert.alert(t('success'), 'Wallpaper tersimpan ke galeri');
    } catch (e) {
      console.error('download error', e);
      Alert.alert(t('error'), 'Gagal mengunduh gambar');
    } finally {
      setLoadingImg(prev => ({ ...prev, [item.id]: false }));
    }
  }

  const isFavTab = activeTab === '_fav';

  function MotivationPage({ item, isFav }) {
    const isFavd = favIds.has(item.id);
    const imgLg = getWallpaperUrl(item);
    const isLoading = loadingImg[item.id];
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [imgLoaded, setImgLoaded] = useState(false);

    useEffect(() => {
      Image.prefetch(imgLg);
    }, [item.id]);

    return (
      <View style={s.page}>
        <View style={s.placeholderBg} />
        <Image
          source={{ uri: imgLg }}
          style={[s.bgImg, { opacity: fadeAnim }]}
          resizeMode="cover"
          onLoad={() => {
            setImgLoaded(true);
            Animated.timing(fadeAnim, {
              toValue: 1, duration: 400, useNativeDriver: true,
            }).start();
          }}
        />
        <View style={[s.overlay, !imgLoaded && s.overlaySolid]}>
          <SafeAreaView style={s.pageInner} edges={['top']}>
            <View style={s.topRow}>
              <View style={s.pillRow}>
                <View style={s.pill}><Text style={s.pillText}>{item.sub}</Text></View>
                {isFav && <Text style={s.catLabel}>{getCategoryLabel(item.cat)}</Text>}
              </View>
              <TouchableOpacity onPress={() => handleFav(item.id)} hitSlop={12}>
                {isFavd
                  ? <BookmarkFillIcon color="#FFD700" size={22} />
                  : <BookmarkIcon color="rgba(255,255,255,0.7)" size={22} />
                }
              </TouchableOpacity>
            </View>
            <View style={s.quoteWrap}>
              <Text style={s.quoteIcon}>&#x201C;</Text>
              <Text style={s.quoteText}>{item.quote}</Text>
              <Text style={s.sourceText}>{item.source}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.bottomRow}>
              <View style={s.titleBlock}>
                <Text style={s.titleText}>{item.title}</Text>
              </View>
              <TouchableOpacity
                style={s.dlBtn}
                onPress={() => handleDownload(item)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <DownloadIcon color="#fff" size={20} />
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={s.tabOverlay}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabScroll}
          data={[...cats, '_fav']}
          keyExtractor={i => i}
          renderItem={({ item }) => {
            const active = activeTab === item;
            return (
              <TouchableOpacity
                style={[s.tab, active && s.tabActive]}
                onPress={() => {
                  setActiveTab(item);
                  if (listRef.current && item !== '_fav') listRef.current.scrollToOffset({ offset: 0, animated: false });
                }}
              >
                {item === '_fav' && <BookmarkFillIcon color={active ? '#1a1a2e' : 'rgba(255,255,255,0.7)'} size={12} />}
                <Text style={[s.tabText, active && s.tabTextActive]}>
                  {item === '_fav' ? 'Favorit' : getCategoryLabel(item)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isFavTab ? (
        favItems.length === 0 ? (
          <View style={[s.page, { backgroundColor: '#0d0d0d' }]}>
            <View style={s.overlay}>
              <View style={s.emptyContent}>
                <BookmarkIcon color="rgba(255,255,255,0.2)" size={50} />
                <Text style={s.emptyTitle}>{t('noFavorites')}</Text>
                <Text style={s.emptyHint}>{t('noFavoritesHint')}</Text>
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={favItems}
            keyExtractor={(item, idx) => `${item.id}-fav-${idx}`}
            renderItem={({ item }) => <MotivationPage item={item} isFav />}
            showsVerticalScrollIndicator={false}
            snapToInterval={SCREEN_H}
            decelerationRate="fast"
            snapToAlignment="start"
            getItemLayout={(_, idx) => ({
              length: SCREEN_H, offset: SCREEN_H * idx, index: idx,
            })}
          />
        )
      ) : (
        items.length === 0 ? (
          <View style={[s.page, { backgroundColor: '#0d0d0d' }]}>
            <View style={s.centerOverlay}>
              <ActivityIndicator size="large" color="rgba(255,255,255,0.4)" />
              <Text style={s.loadingText}>Memuat...</Text>
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            renderItem={({ item }) => <MotivationPage item={item} isFav={false} />}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            snapToInterval={SCREEN_H}
            decelerationRate="fast"
            snapToAlignment="start"
            getItemLayout={(_, idx) => ({
              length: SCREEN_H, offset: SCREEN_H * idx, index: idx,
            })}
            removeClippedSubviews={false}
          />
        )
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  page: { height: SCREEN_H, width: SCREEN_W },
  bgImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  placeholderBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
  },
  overlaySolid: { backgroundColor: 'rgba(0,0,0,0.7)' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'space-between',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  pageInner: { flex: 1, paddingHorizontal: 28, paddingBottom: 32 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 56 : 28,
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  pillText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  catLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  quoteWrap: { flex: 1, justifyContent: 'center', paddingBottom: 32, paddingTop: 8 },
  quoteIcon: {
    fontSize: 56, color: 'rgba(255,255,255,0.08)', fontWeight: '400',
    marginBottom: -20, lineHeight: 60, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  quoteText: {
    fontSize: 22, color: '#fff', fontWeight: '400', lineHeight: 34,
    letterSpacing: 0.2, fontStyle: 'italic',
  },
  sourceText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 14, fontWeight: '500', letterSpacing: 0.5 },
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  bottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 32, gap: 16,
  },
  titleBlock: { flex: 1 },
  titleText: { fontSize: 16, color: '#fff', fontWeight: '700', opacity: 0.9, letterSpacing: 0.3 },
  dlBtn: {
    width: 46, height: 46, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

  tabOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 30) + 4 : 52,
  },
  tabScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 4, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#fff' },
  tabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.3 },
  tabTextActive: { color: '#1a1a2e' },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  emptyHint: { fontSize: 14, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 48 },
});
