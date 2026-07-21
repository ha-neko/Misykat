import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getShuffled, getSubcategories, getCategoryLabel, getCategories,
  getFavorites, getFavIds, toggleFavorite,
} from '../utils/motivations';
import { BookmarkIcon, BookmarkFillIcon } from '../components/Icons';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

const PAGE_SIZE = 6;
const MAX_CACHE = 10;

export default function MotivationScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const cats = getCategories();
  const [activeTab, setActiveTab] = useState('pekerjaan');
  const [items, setItems] = useState([]);
  const [shownIds, setShownIds] = useState(new Set());
  const [pool, setPool] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [favIds, setFavIds] = useState(new Set());
  const [favorites, setFavorites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadFavorites(); }, []);

  useEffect(() => {
    if (activeTab !== '_fav') {
      refreshPool();
    }
  }, [activeTab]);

  async function loadFavorites() {
    const ids = await getFavIds();
    setFavIds(new Set(ids));
    setFavorites(await getFavorites());
  }

  function refreshPool() {
    const shuffled = getShuffled(activeTab);
    setPool(shuffled);
    setShownIds(new Set());
    setItems(shuffled.slice(0, PAGE_SIZE));
    setShownIds(new Set(shuffled.slice(0, PAGE_SIZE).map(i => i.id)));
  }

  function loadMore() {
    const available = pool.filter(i => !shownIds.has(i.id));
    if (available.length === 0) {
      const reshuffled = getShuffled(activeTab);
      setPool(reshuffled);
      const keep = items.slice(-MAX_CACHE);
      const keepIds = new Set(keep.map(i => i.id));
      const newItems = reshuffled.filter(i => !keepIds.has(i.id)).slice(0, PAGE_SIZE);
      if (newItems.length > 0) {
        setItems(prev => [...prev, ...newItems]);
        setShownIds(prev => {
          const merged = new Set(prev);
          newItems.forEach(i => merged.add(i.id));
          return merged;
        });
      }
      return;
    }
    const next = available.slice(0, PAGE_SIZE);
    setItems(prev => [...prev, ...next]);
    setShownIds(prev => {
      const merged = new Set(prev);
      next.forEach(i => merged.add(i.id));
      return merged;
    });
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    refreshPool();
    setRefreshing(false);
  }, [activeTab]);

  async function handleFav(id) {
    await toggleFavorite(id);
    await loadFavorites();
    setItems(prev => prev.map(i => i.id === id ? { ...i, _favToggled: true } : i));
  }

  const isFavTab = activeTab === '_fav';

  function renderItem({ item }) {
    const isFav = favIds.has(item.id);
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => setSelectedItem(item)}
        activeOpacity={0.85}
      >
        <View style={s.cardTop}>
          <View style={s.cardLabelRow}>
            <View style={s.subBadge}>
              <Text style={s.subBadgeText}>{item.sub}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleFav(item.id)} hitSlop={12}>
            {isFav ? <BookmarkFillIcon color={colors.accent} size={20} /> : <BookmarkIcon color={colors.outline} size={20} />}
          </TouchableOpacity>
        </View>
        <Text style={s.cardTitle}>{item.title}</Text>
        <Text style={s.cardQuote} numberOfLines={2}>{item.quote}</Text>
        <Text style={s.cardSource}>{item.source}</Text>
      </TouchableOpacity>
    );
  }

  function renderFavItem({ item }) {
    const isFav = favIds.has(item.id);
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => setSelectedItem(item)}
        activeOpacity={0.85}
      >
        <View style={s.cardTop}>
          <View style={s.cardLabelRow}>
            <View style={s.subBadge}><Text style={s.subBadgeText}>{item.sub}</Text></View>
            <Text style={s.catLabel}>{getCategoryLabel(item.cat)}</Text>
          </View>
          <TouchableOpacity onPress={() => handleFav(item.id)} hitSlop={12}>
            {isFav ? <BookmarkFillIcon color={colors.accent} size={20} /> : <BookmarkIcon color={colors.outline} size={20} />}
          </TouchableOpacity>
        </View>
        <Text style={s.cardTitle}>{item.title}</Text>
        <Text style={s.cardQuote} numberOfLines={2}>{item.quote}</Text>
        <Text style={s.cardSource}>{item.source}</Text>
      </TouchableOpacity>
    );
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topDecoration}>
        <View style={s.decoDot} /><View style={s.decoDot} /><View style={s.decoDot} />
      </View>
      <View style={s.header}>
        <Text style={s.pageTitle}>{t('motivation')}</Text>
      </View>

      <View style={s.tabRow}>
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
                onPress={() => setActiveTab(item)}
              >
                {item === '_fav' ? (
                  <BookmarkIcon color={active ? colors.onPrimary : colors.outline} size={14} />
                ) : null}
                <Text style={[s.tabText, active && s.tabTextActive]}>
                  {item === '_fav' ? 'Favorit' : getCategoryLabel(item)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isFavTab ? (
        favorites.length === 0 ? (
          <View style={s.empty}>
            <BookmarkIcon color={colors.outline} size={40} />
            <Text style={s.emptyTitle}>{t('noFavorites')}</Text>
            <Text style={s.emptyHint}>{t('noFavoritesHint')}</Text>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={i => i.id}
            renderItem={renderFavItem}
            contentContainerStyle={s.list}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onEndReached={loadMore}
          onEndReachedThreshold={2}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => items.length > 0 ? <View style={{ height: 24 }} /> : null}
        />
      )}

      <Modal visible={!!selectedItem} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{selectedItem?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)} hitSlop={12}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={[selectedItem]}
              keyExtractor={i => i.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View>
                  <Text style={s.modalQuote}>{item.quote}</Text>
                  <Text style={s.modalSource}>{item.source}</Text>
                  <View style={s.modalDivider} />
                  <Text style={s.modalContent}>{item.content}</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  topDecoration: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 4, paddingBottom: 2 },
  decoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent, opacity: 0.3 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: c.onSurface },
  tabRow: { borderBottomWidth: 1, borderBottomColor: c.borderLight },
  tabScroll: { paddingHorizontal: 12, gap: 6, paddingBottom: 10, paddingTop: 2 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight,
  },
  tabActive: { backgroundColor: c.primary, borderColor: c.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: c.onSurfaceVariant },
  tabTextActive: { color: c.onPrimary },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: c.surface, borderRadius: 16, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: c.borderLight,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: c.primaryContainer,
  },
  subBadgeText: { fontSize: 10, fontWeight: '600', color: c.primary },
  catLabel: { fontSize: 10, color: c.onSurfaceVariant, fontWeight: '500' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: c.onSurface, marginBottom: 6 },
  cardQuote: { fontSize: 13, color: c.onSurfaceVariant, fontStyle: 'italic', lineHeight: 19 },
  cardSource: { fontSize: 11, color: c.accent, marginTop: 5, fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: c.onSurfaceVariant, marginTop: 12 },
  emptyHint: { fontSize: 13, color: c.outline, textAlign: 'center', paddingHorizontal: 48, lineHeight: 18 },
  overlay: {
    flex: 1, backgroundColor: c.scrim + '80', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modal: {
    backgroundColor: c.surface, borderRadius: 24, padding: 24, width: '100%', maxHeight: '80%',
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: c.onSurface, flex: 1, marginRight: 16 },
  modalClose: { fontSize: 20, color: c.outline, fontWeight: '600' },
  modalQuote: { fontSize: 15, color: c.onSurfaceVariant, fontStyle: 'italic', lineHeight: 23 },
  modalSource: { fontSize: 12, color: c.accent, marginTop: 6, fontWeight: '500' },
  modalDivider: { height: 1, backgroundColor: c.borderLight, marginVertical: 16 },
  modalContent: { fontSize: 14, color: c.onSurface, lineHeight: 22 },
});
