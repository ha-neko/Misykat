import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, StatusBar,
  Dimensions, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DownloadIcon, BookmarkIcon, BookmarkFillIcon } from '../components/Icons';
import {
  getCategories, getCategoryLabel,
  getFavIds, toggleFavorite,
  getFavorites, fetchBatch,
} from '../utils/motivations';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const PAGE_SIZE = 4;

// small image for the background (fast load), larger for download
const BG_W = Math.round(SCREEN_W / 3);
const BG_H = Math.round(SCREEN_H / 3);
const DL_W = 1080;
const DL_H = 1920;

function getWallpaperUrl(item, size) {
  const base = item.id || 'umum';
  if (size === 'dl') return `https://picsum.photos/seed/${base}/${DL_W}/${DL_H}`;
  return `https://picsum.photos/seed/${base}/${BG_W}/${BG_H}`;
}

// adaptive quote font size based on text length
function getQuoteStyle(text) {
  const len = (text || '').length;
  let fontSize = 24;
  if (len >= 60) fontSize = 22;
  if (len >= 120) fontSize = 20;
  if (len >= 200) fontSize = 18;
  if (len >= 300) fontSize = 16;
  return { fontSize, lineHeight: Math.round(fontSize * 1.55) };
}

export default function MotivationScreen() {
  const cats = getCategories();
  const listRef = useRef(null);
  const [items, setItems] = useState([]);
  const [favIds, setFavIdsState] = useState(new Set());
  const [favItems, setFavItems] = useState([]);
  const [activeTab, setActiveTab] = useState(cats[0]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [dlPending, setDlPending] = useState({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    loadFavs();
    loadCategory(cats[0]);
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (activeTab !== '_fav') {
      setLoading(true);
      setHasMore(true);
      loadCategory(activeTab);
    }
  }, [activeTab]);

  async function loadFavs() {
    const ids = await getFavIds();
    setFavIdsState(new Set(ids));
    setFavItems(await getFavorites());
  }

  async function loadCategory(cat) {
    try {
      const result = await fetchBatch(cat, PAGE_SIZE);
      if (!mounted.current) return;
      if (!result || result.length === 0) {
        setItems([]);
        setHasMore(false);
      } else {
        setItems(result);
        prefetchWallpapers(result);
        setHasMore(result.length >= PAGE_SIZE);
      }
    } catch {
      setItems([]);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  function prefetchWallpapers(list) {
    try {
      list.forEach(i => Image.prefetch(getWallpaperUrl(i)));
    } catch {}
  }

  function loadMore() {
    if (!hasMore || loading) return;
    // Re-fetch with same category — new random items
    fetchBatch(activeTab, PAGE_SIZE).then(result => {
      if (!mounted.current) return;
      if (result && result.length > 0) {
        setItems(prev => [...prev, ...result]);
        prefetchWallpapers(result);
        setHasMore(result.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    });
  }

  async function handleFav(id) {
    await toggleFavorite(id);
    const ids = await getFavIds();
    setFavIdsState(new Set(ids));
  }

  async function handleDownload(item) {
    const id = item.id;
    setDlPending(prev => ({ ...prev, [id]: true }));
    try {
      const fs = require('expo-file-system');
      const media = require('expo-media-library');
      const url = getWallpaperUrl(item, 'dl');
      const fileUri = fs.cacheDirectory + `misykat-${id}.jpg`;
      await fs.downloadAsync(url, fileUri);
      const asset = await media.createAssetAsync(fileUri);
      await media.createAlbumAsync('Misykat', asset, false);
      Alert.alert('Tersimpan', 'Wallpaper tersimpan ke galeri');
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menyimpan gambar');
    } finally {
      if (mounted.current) setDlPending(prev => ({ ...prev, [id]: false }));
    }
  }

  const isFavTab = activeTab === '_fav';

  function renderPage(item, isFromFav) {
    const isFavd = favIds.has(item.id);
    const imgUrl = getWallpaperUrl(item);
    const loadingDl = dlPending[item.id];
    const text = item.quote || item.ayat || item.text || '';
    const source = item.source || item.surah || '';
    const title = item.title || '';
    const sub = item.sub || '';
    const qStyle = getQuoteStyle(text);

    return (
      <View style={s.page}>
        <Image
          source={{ uri: imgUrl }}
          style={s.bgImg}
          resizeMode="cover"
          fadeDuration={0}
        />
        <View style={s.overlay}>
          <SafeAreaView style={s.pageInner} edges={['top']}>
            {/* Top row: pill + bookmark */}
            <View style={s.topRow}>
              <View style={s.pillRow}>
                {sub ? (
                  <View style={s.pill}><Text style={s.pillText}>{sub}</Text></View>
                ) : null}
                {isFromFav ? (
                  <Text style={s.catLabel}>{getCategoryLabel(item.cat)}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => handleFav(item.id)} hitSlop={12}>
                {isFavd
                  ? <BookmarkFillIcon color="#FFD700" size={22} />
                  : <BookmarkIcon color="rgba(255,255,255,0.7)" size={22} />
                }
              </TouchableOpacity>
            </View>

            {/* Quote */}
            <View style={s.quoteWrap}>
              <Text style={s.quoteIcon}>"</Text>
              <Text style={[s.quoteText, qStyle]}>{text}</Text>
              {source ? <Text style={s.sourceText}>{source}</Text> : null}
            </View>

            {/* Bottom row: title + download */}
            <View style={s.bottomRow}>
              <Text style={s.titleText} numberOfLines={1}>{title}</Text>
              <TouchableOpacity
                style={s.dlBtn}
                onPress={() => handleDownload(item)}
                disabled={loadingDl}
                activeOpacity={0.7}
              >
                {loadingDl ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <DownloadIcon size={18} color="rgba(255,255,255,0.7)" />
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

      {/* Floating tab bar */}
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
                  if (listRef.current) listRef.current.scrollToOffset({ offset: 0, animated: false });
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

      {/* Content */}
      {loading && activeTab !== '_fav' ? (
        <View style={[s.page, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.4)" />
        </View>
      ) : isFavTab ? (
        favItems.length === 0 ? (
          <View style={[s.page, { backgroundColor: '#0d0d0d' }]}>
            <View style={s.overlay}>
              <View style={s.emptyContent}>
                <BookmarkIcon color="rgba(255,255,255,0.2)" size={50} />
                <Text style={s.emptyTitle}>Belum ada favorit</Text>
                <Text style={s.emptyHint}>Tambahkan motivasi ke favorit dengan menekan ikon bookmark</Text>
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={favItems}
            keyExtractor={(item, idx) => `${item.id}-fav-${idx}`}
            renderItem={({ item }) => renderPage(item, true)}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            snapToAlignment="start"
          />
        )
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          renderItem={({ item }) => renderPage(item, false)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={2}
          decelerationRate="fast"
          snapToAlignment="start"
          ListFooterComponent={
            hasMore && items.length > 0 ? (
              <View style={s.footer}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  page: { height: SCREEN_H, width: SCREEN_W },
  bgImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'space-between',
  },
  pageInner: {
    flex: 1, paddingHorizontal: 28, paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 50 : 24,
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  pillText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  catLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  quoteWrap: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  quoteIcon: {
    fontSize: 64, color: 'rgba(255,255,255,0.12)', fontWeight: '700',
    marginBottom: -16, lineHeight: 72,
  },
  quoteText: {
    color: '#fff', fontWeight: '400',
    letterSpacing: 0.3, fontStyle: 'italic',
  },
  sourceText: {
    fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 12, fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 96,
  },
  titleText: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600',
    flex: 1, marginRight: 12,
  },
  dlBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
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
  tabText: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.3,
  },
  tabTextActive: { color: '#1a1a2e' },
  emptyContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  emptyHint: {
    fontSize: 14, color: 'rgba(255,255,255,0.25)', textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 48,
  },
  footer: { height: SCREEN_H, justifyContent: 'center', alignItems: 'center' },
});
