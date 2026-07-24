import React, { Component, useEffect, useState, useRef, useCallback } from 'react';
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
import { captureError } from '../utils/errorLog';
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
  if (!item || !item.id) return `https://picsum.photos/seed/fallback/${Math.round(SCREEN_W)}/${Math.round(SCREEN_H)}`;
  const kw = KEYWORDS[item.cat] || 'nature';
  const terms = kw.split(',');
  const idx = Math.abs(item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % terms.length;
  const base = terms[idx] || 'nature';
  const width = w || Math.round(SCREEN_W);
  const height = h || Math.round(SCREEN_H);
  return `https://picsum.photos/seed/${base}-${item.id}/${width}/${height}`;
}

function MotivationScreen() {
  const { t } = useLocale();
  const cats = getCategories();
  const listRef = useRef(null);
  const loadingRef = useRef(false);

  const [activeTab, setActiveTab] = useState('pekerjaan');
  const [items, setItems] = useState([]);
  const [favIds, setFavIdsState] = useState(new Set());
  const [favItems, setFavItems] = useState([]);
  const [loadingImg, setLoadingImg] = useState({});

  useEffect(() => { loadFavs().catch(() => {}); }, []);

  // init pool when tab changes
  useEffect(() => {
    if (activeTab === '_fav') return;
    let mounted = true;
    loadingRef.current = false;
    resetSeen();
    if (mounted) setItems([]);
    (async () => {
      try {
        const batch = await fetchBatch(activeTab, PAGE_SIZE);
        if (!mounted) return;
        if (batch.length > 0) {
          batch.forEach(v => markSeen(v.id));
          setItems(batch);
        } else {
          // retry once with small delay
          const retry = await fetchBatch(activeTab, PAGE_SIZE);
          if (!mounted) return;
          if (retry.length > 0) {
            retry.forEach(v => markSeen(v.id));
            setItems(retry);
          }
        }
      } catch {
        // silent
      }
    })();
    return () => { mounted = false; };
  }, [activeTab]);

  // preload images
  useEffect(() => {
    try {
      items.forEach(i => {
        const url = getWallpaperUrl(i);
        if (url) Image.prefetch(url).catch(() => {});
      });
    } catch { /* silent */ }
  }, [items]);

  const tabRef = useRef(activeTab);
  tabRef.current = activeTab;

  async function loadMore() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const verse = await fetchOne(tabRef.current);
      if (verse) {
        markSeen(verse.id);
        setItems(prev => [...prev, verse]);
      }
    } catch {
      // ignore fetch errors
    } finally {
      loadingRef.current = false;
    }
  }

  const handleScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distFromEnd = contentSize.height - contentOffset.y - layoutMeasurement.height;
    if (distFromEnd < SCREEN_H * 0.4 && !loadingRef.current) {
      loadMore();
    }
  }, []);

  async function loadFavs() {
    const ids = await getFavIds();
    setFavIdsState(new Set(ids));
    // resolve cached items for display
    const resolved = ids.map(id => getCachedVerse(id)).filter(Boolean);
    setFavItems(resolved);
  }

  async function handleFav(id) {
    try {
      await toggleFavorite(id);
      await loadFavs();
    } catch { /* silent */ }
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
    const sub = item.sub || 'renungan';
    const quote = item.quote || '';
    const source = item.source || '';
    const title = item.title || '';

    useEffect(() => {
      Image.prefetch(imgLg).catch(() => {});
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
                <View style={s.pill}><Text style={s.pillText}>{sub}</Text></View>
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
              <Text style={s.quoteText}>{quote}</Text>
              <Text style={s.sourceText}>{source}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.bottomRow}>
              <View style={s.titleBlock}>
                <Text style={s.titleText}>{title}</Text>
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
  overlaySolid: { backgroundColor: 'rgba(0,0,0,0.65)' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.30)',
    justifyContent: 'space-between',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  pageInner: { flex: 1, paddingHorizontal: 32, paddingBottom: 24 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 48 : 20,
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pillText: { fontSize: 12, fontWeight: '600', color: '#fff', letterSpacing: 0.4, opacity: 0.9 },
  catLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  quoteWrap: { flex: 1, justifyContent: 'center', paddingBottom: 24, paddingTop: 4 },
  quoteIcon: {
    fontSize: 48, color: 'rgba(255,255,255,0.06)', fontWeight: '400',
    marginBottom: -16, lineHeight: 52, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  quoteText: {
    fontSize: 20, color: '#fff', fontWeight: '400', lineHeight: 30,
    letterSpacing: 0.1, fontStyle: 'italic',
  },
  sourceText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 12, fontWeight: '500', letterSpacing: 0.3 },
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 28, gap: 14,
  },
  titleBlock: { flex: 1 },
  titleText: { fontSize: 15, color: '#fff', fontWeight: '600', opacity: 0.85, letterSpacing: 0.2 },
  dlBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },

  tabOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 2 : 48,
    paddingHorizontal: 12,
  },
  tabScroll: { paddingHorizontal: 4, gap: 6, paddingVertical: 4, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.5)' },
  tabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.2 },
  tabTextActive: { color: '#1a1a2e', fontWeight: '700' },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  emptyHint: { fontSize: 14, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 48 },
});

// ---- error boundary ----
class MotivationScreenErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    captureError(error, `MotivationScreen\n${info?.componentStack || ''}`);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0d0d0d', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#ff4444', marginBottom: 12 }}>Terjadi error</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ error: null })}
            style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <MotivationScreen />;
  }
}

export default MotivationScreenErrorBoundary;
