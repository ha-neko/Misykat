import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getShuffled, getCategories, getCategoryLabel,
  getFavorites, getFavIds, toggleFavorite, getMotivationById,
} from '../utils/motivations';
import { BookmarkIcon, BookmarkFillIcon } from '../components/Icons';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

const { height: SCREEN_H } = Dimensions.get('window');
const PAGE_SIZE = 8;
const MAX_CACHE = 12;

const BG_PALETTE = [
  ['#1a1a2e', '#16213e'],
  ['#2d1b69', '#11998e'],
  ['#0f3443', '#34e89e'],
  ['#2c3e50', '#3498db'],
  ['#141e30', '#243b55'],
  ['#1f1c2c', '#928dab'],
  ['#0d0d0d', '#3a1c71'],
  ['#1a1a2e', '#e94560'],
  ['#0f0c29', '#302b63'],
  ['#42275a', '#734b6d'],
  ['#1b2735', '#090a0f'],
  ['#1d2671', '#c33764'],
  ['#0b8793', '#360033'],
  ['#2b0b42', '#5b2a6b'],
  ['#1a2a6c', '#b21f1f'],
];

function removeItem(arr, id) {
  const idx = arr.findIndex(i => i.id === id);
  if (idx !== -1) arr.splice(idx, 1);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function MotivationScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const cats = getCategories();
  const listRef = useRef(null);
  const poolRef = useRef([]);
  const recentRef = useRef([]);
  const currentTab = useRef('pekerjaan');

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
    const initial = shuffled.slice(0, PAGE_SIZE).map((item, i) => ({
      ...item,
      _bgIdx: i % BG_PALETTE.length,
    }));
    setItems(initial);
    initial.forEach(i => recentRef.current.push(i.id));
  }

  function loadMore() {
    const recent = recentRef.current;
    const available = poolRef.current.filter(i => !recent.includes(i.id));
    if (available.length === 0) {
      poolRef.current = shuffle(getShuffled(currentTab.current));
      recentRef.current = [];
      const fresh = poolRef.current.slice(0, PAGE_SIZE).map((item, i) => ({
        ...item,
        _bgIdx: (i + items.length) % BG_PALETTE.length,
      }));
      setItems(prev => [...prev, ...fresh]);
      fresh.forEach(i => recentRef.current.push(i.id));
      return;
    }
    const next = available.slice(0, PAGE_SIZE).map((item, i) => ({
      ...item,
      _bgIdx: (i + items.length) % BG_PALETTE.length,
    }));
    setItems(prev => [...prev, ...next]);
    const newRecent = [...recentRef.current, ...next.map(i => i.id)];
    if (newRecent.length > MAX_CACHE) {
      newRecent.splice(0, newRecent.length - MAX_CACHE);
    }
    recentRef.current = newRecent;
  }

  async function handleFav(id) {
    await toggleFavorite(id);
    await loadFavs();
  }

  const isFavTab = activeTab === '_fav';

  function renderQuote({ item }) {
    const bg = BG_PALETTE[item._bgIdx % BG_PALETTE.length];
    const isFav = favIds.has(item.id);
    return (
      <View style={[s.page, { backgroundColor: bg[0] }]}>
        <View style={[s.bgAccent, { backgroundColor: bg[1] }]} />
        <SafeAreaView style={s.pageInner} edges={['top']}>
          <View style={s.topRow}>
            <View style={s.pillRow}>
              <View style={s.pill}><Text style={s.pillText}>{item.sub}</Text></View>
            </View>
            <TouchableOpacity onPress={() => handleFav(item.id)} hitSlop={12}>
              {isFav
                ? <BookmarkFillIcon color="#FFD700" size={22} />
                : <BookmarkIcon color="rgba(255,255,255,0.6)" size={22} />
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
          </View>
        </SafeAreaView>
      </View>
    );
  }

  function renderFavItem({ item }) {
    const bg = BG_PALETTE[Math.abs(item.id.charCodeAt(0)) % BG_PALETTE.length];
    const isFav = favIds.has(item.id);
    return (
      <View style={[s.page, { backgroundColor: bg[0] }]}>
        <View style={[s.bgAccent, { backgroundColor: bg[1] }]} />
        <SafeAreaView style={s.pageInner} edges={['top']}>
          <View style={s.topRow}>
            <View style={s.pillRow}>
              <View style={s.pill}><Text style={s.pillText}>{item.sub}</Text></View>
              <Text style={s.catLabel}>{getCategoryLabel(item.cat)}</Text>
            </View>
            <TouchableOpacity onPress={() => handleFav(item.id)} hitSlop={12}>
              {isFav
                ? <BookmarkFillIcon color="#FFD700" size={22} />
                : <BookmarkIcon color="rgba(255,255,255,0.6)" size={22} />
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
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
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
          <View style={[s.emptyRoot, { backgroundColor: '#1a1a2e' }]}>
            <BookmarkIcon color="rgba(255,255,255,0.3)" size={50} />
            <Text style={s.emptyTitle}>{t('noFavorites')}</Text>
            <Text style={s.emptyHint}>{t('noFavoritesHint')}</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={favItems}
            keyExtractor={(item, idx) => `${item.id}-fav-${idx}`}
            renderItem={renderFavItem}
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
          renderItem={renderQuote}
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
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  page: {
    height: SCREEN_H,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bgAccent: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
  },
  pageInner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pillText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
  catLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  quoteWrap: { flex: 1, justifyContent: 'center', paddingBottom: 60 },
  quoteIcon: {
    fontSize: 72,
    color: 'rgba(255,255,255,0.1)',
    fontWeight: '700',
    marginBottom: -20,
    lineHeight: 80,
  },
  quoteText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '400',
    lineHeight: 34,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  sourceText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 14,
    fontWeight: '500',
  },
  bottomRow: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  titleText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 30 : 50,
  },
  tabScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 4, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: 'rgba(255,255,255,0.9)',
  },
  tabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 },
  tabTextActive: { color: '#1a1a2e' },
  emptyRoot: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 48, gap: 10,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  emptyHint: { fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 20 },
});
