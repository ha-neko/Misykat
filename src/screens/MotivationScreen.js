import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, StatusBar,
  Dimensions, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  getShuffled, getCategories, getCategoryLabel,
  getFavorites, getFavIds, toggleFavorite,
} from '../utils/motivations';
import { BookmarkIcon, BookmarkFillIcon } from '../components/Icons';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const PAGE_SIZE = 6;
const MAX_CACHE = 10;

const KEYWORDS = {
  pekerjaan: 'business,office,architecture,city',
  keluarga: 'family,home,people,nature',
  umum: 'nature,life,landscape,mountain',
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getWallpaperUrl(item) {
  const kw = KEYWORDS[item.cat] || 'nature';
  const terms = kw.split(',');
  const base = terms[Math.abs(item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % terms.length];
  return `https://picsum.photos/seed/${base}-${item.id}/${Math.round(SCREEN_W)}/${Math.round(SCREEN_H)}`;
}

export default function MotivationScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const cats = getCategories();
  const listRef = useRef(null);
  const poolRef = useRef([]);
  const recentRef = useRef([]);
  const currentTab = useRef('pekerjaan');
  const [loadingImg, setLoadingImg] = useState({});

  const [activeTab, setActiveTab] = useState('pekerjaan');
  const [items, setItems] = useState([]);
  const [favIds, setFavIdsState] = useState(new Set());
  const [favItems, setFavItems] = useState([]);

  useEffect(() => { loadFavs(); }, []);

  useEffect(() => {
    if (activeTab !== '_fav') {
      currentTab.current = activeTab;
      initPool(activeTab);
    }
  }, [activeTab]);

  async function loadFavs() {
    const ids = await getFavIds();
    setFavIdsState(new Set(ids));
    setFavItems(await getFavorites());
  }

  function initPool(cat) {
    const shuffled = shuffle(getShuffled(cat));
    poolRef.current = shuffled;
    recentRef.current = [];
    setItems(shuffled.slice(0, PAGE_SIZE));
    shuffled.slice(0, PAGE_SIZE).forEach(i => recentRef.current.push(i.id));
  }

  function loadMore() {
    const recent = recentRef.current;
    const available = poolRef.current.filter(i => !recent.includes(i.id));
    if (available.length === 0) {
      poolRef.current = shuffle(getShuffled(currentTab.current));
      recentRef.current = [];
      const fresh = poolRef.current.slice(0, PAGE_SIZE);
      setItems(prev => [...prev, ...fresh]);
      fresh.forEach(i => recentRef.current.push(i.id));
      return;
    }
    const next = available.slice(0, PAGE_SIZE);
    setItems(prev => [...prev, ...next]);
    const newRecent = [...recentRef.current, ...next.map(i => i.id)];
    if (newRecent.length > MAX_CACHE) newRecent.splice(0, newRecent.length - MAX_CACHE);
    recentRef.current = newRecent;
  }

  async function handleFav(id) {
    await toggleFavorite(id);
    await loadFavs();
  }

  async function handleDownload(item) {
    try {
      setLoadingImg(prev => ({ ...prev, [item.id]: true }));
      const url = getWallpaperUrl(item);
      const ext = 'jpg';
      const filename = `misykat-${item.cat}-${item.id}.${ext}`;
      const dest = FileSystem.cacheDirectory + filename;

      const dl = await FileSystem.downloadAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, {
          mimeType: 'image/jpeg',
          dialogTitle: item.title,
        });
      } else {
        Alert.alert(t('success'), 'Gambar tersimpan di cache');
      }
    } catch (e) {
      Alert.alert(t('error'), 'Gagal mengunduh gambar');
    } finally {
      setLoadingImg(prev => ({ ...prev, [item.id]: false }));
    }
  }

  const isFavTab = activeTab === '_fav';

  function renderPage(item, isFav) {
    const isFavd = favIds.has(item.id);
    const imgUrl = getWallpaperUrl(item);
    const isLoading = loadingImg[item.id];

    return (
      <View style={s.page}>
        <Image source={{ uri: imgUrl }} style={s.bgImg} resizeMode="cover" />
        <View style={s.overlay}>
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
              <Text style={s.quoteIcon}>"</Text>
              <Text style={s.quoteText}>{item.quote}</Text>
              <Text style={s.sourceText}>{item.source}</Text>
            </View>
            <View style={s.bottomRow}>
              <Text style={s.titleText}>{item.title}</Text>
              <TouchableOpacity
                style={s.dlBtn}
                onPress={() => handleDownload(item)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.dlBtnText}>⬇</Text>
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
  pageInner: { flex: 1, paddingHorizontal: 28, paddingBottom: 40 },
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
  quoteIcon: { fontSize: 64, color: 'rgba(255,255,255,0.12)', fontWeight: '700', marginBottom: -16, lineHeight: 72 },
  quoteText: {
    fontSize: 21, color: '#fff', fontWeight: '400', lineHeight: 32,
    letterSpacing: 0.3, fontStyle: 'italic',
  },
  sourceText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 12, fontWeight: '500' },
  bottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 24,
  },
  titleText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', flex: 1, marginRight: 12 },
  dlBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  dlBtnText: { fontSize: 18, color: '#fff' },
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
