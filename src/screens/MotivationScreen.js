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
const NUM_COLS = 1;
const PAGE_SIZE = 4;

const WALLPAPERS = {
  pekerjaan: 'https://picsum.photos/seed/pekerjaan/720/1280',
  keluarga: 'https://picsum.photos/seed/keluarga/720/1280',
  umum: 'https://picsum.photos/seed/umum/720/1280',
  ibadah: 'https://picsum.photos/seed/ibadah/720/1280',
};

export default function MotivationScreen() {
  const categories = getCategories();
  const [selectedCat, setSelectedCat] = useState(categories[0]);
  const [items, setItems] = useState([]);
  const [favIds, setFavIds] = useState(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favTab, setFavTab] = useState(false);
  const [favItems, setFavItems] = useState([]);
  const [wallpaperLoaded, setWallpaperLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const catAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInitial();
    loadFavIds();
  }, []);

  useEffect(() => {
    if (!favTab && categories.includes(selectedCat)) {
      setItems([]);
      setPage(0);
      setHasMore(true);
      setLoading(true);
      setWallpaperLoaded(false);
      fadeAnim.setValue(0);
      const t = setTimeout(() => loadCategory(selectedCat, 0), 50);
      return () => clearTimeout(t);
    }
  }, [selectedCat, favTab]);

  useEffect(() => {
    if (!loading && items.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
    }
  }, [loading, items]);

  useEffect(() => {
    if (favTab) loadFavItems();
  }, [favTab]);

  const wallpaper = WALLPAPERS[selectedCat] || WALLPAPERS.umum;

  async function loadInitial() {
    setLoading(true);
    const cat = categories[0];
    setSelectedCat(cat);
    await loadCategory(cat, 0);
    setLoading(false);
  }

  async function loadCategory(cat, startPage) {
    try {
      const result = await fetchBatch(cat, startPage, PAGE_SIZE);
      if (!result || !result.items) return;
      setItems(startPage === 0 ? result.items : prev => [...prev, ...result.items]);
      setHasMore(result.hasMore !== false);
    } catch (e) {
      // silent
    }
  }

  async function loadFavIds() {
    try { const ids = await getFavIds(); setFavIds(ids); } catch {}
  }

  async function loadFavItems() {
    try { const f = await getFavorites(); setFavItems(f); } catch {}
  }

  async function handleToggleFav(id) {
    await toggleFavorite(id);
    const ids = await getFavIds();
    setFavIds(ids);
  }

  function onRefresh() {
    setRefreshing(true);
    setItems([]); setPage(0); setHasMore(true); setLoading(true);
    setWallpaperLoaded(false); fadeAnim.setValue(0);
    loadCategory(selectedCat, 0).then(() => { setRefreshing(false); setLoading(false); });
  }

  function onEndReached() {
    if (!hasMore || loading || refreshing) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadCategory(selectedCat, nextPage);
  }

  function selectCategory(cat) {
    setFavTab(false);
    setSelectedCat(cat);
  }

  function selectFav() {
    setFavTab(true);
    loadFavItems();
  }

  const renderItem = ({ item }) => {
    const key = item?.id || Math.random().toString();
    const text = item?.text || item?.ayat || item?.quote || '';
    const source = item?.source || item?.surah || '';
    const isFavItem = favIds.has(key);

    return (
      <View style={s.itemCard}>
        <Text style={s.itemText} numberOfLines={6}>{text}</Text>
        {source ? <Text style={s.itemSource}>{source}</Text> : null}
        <View style={s.itemActions}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleToggleFav(key)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isFavItem ? (
              <BookmarkFillIcon size={20} color="#fbbf24" />
            ) : (
              <BookmarkIcon size={20} color="rgba(255,255,255,0.4)" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Wallpaper */}
      <Image
        source={{ uri: wallpaper }}
        style={s.wallpaper}
        onLoad={() => setWallpaperLoaded(true)}
        blurRadius={2}
      />
      <View style={s.overlay} />

      <SafeAreaView style={s.content}>
        <View style={s.tabRow}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[s.tab, selectedCat === cat && !favTab && s.tabActive]}
              onPress={() => selectCategory(cat)}
            >
              <Text style={[s.tabLabel, selectedCat === cat && !favTab && s.tabLabelActive]}>
                {getCategoryLabel(cat)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.tab, favTab && s.tabActive]}
            onPress={selectFav}
          >
            <Text style={[s.tabLabel, favTab && s.tabLabelActive]}>Favorit</Text>
          </TouchableOpacity>
        </View>

        {favTab ? (
          <FlatList
            data={favItems}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            ListEmptyComponent={<Text style={s.emptyText}>Belum ada favorit</Text>}
          />
        ) : loading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.4)" />
          </View>
        ) : (
          <Animated.FlatList
            data={items}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            onRefresh={onRefresh}
            refreshing={refreshing}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            style={{ opacity: fadeAnim }}
            ListFooterComponent={
              hasMore ? (
                <View style={s.footer}>
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.3)" />
                </View>
              ) : null
            }
            ListEmptyComponent={<Text style={s.emptyText}>Tidak ada item</Text>}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  wallpaper: {
    ...StyleSheet.absoluteFillObject, width: '100%', height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  content: { flex: 1 },
  tabRow: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12,
    paddingTop: 56, paddingBottom: 28, gap: 8,
  },
  tab: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  tabActive: { borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)' },
  tabLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  tabLabelActive: { color: '#fbbf24' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  itemCard: {
    padding: 16, marginBottom: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
  },
  itemText: { fontSize: 14, color: '#fff', lineHeight: 22 },
  itemSource: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 },
  itemActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  actionBtn: { padding: 4 },
  emptyText: { color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 80, fontSize: 14 },
  footer: { paddingVertical: 20, alignItems: 'center' },
});
