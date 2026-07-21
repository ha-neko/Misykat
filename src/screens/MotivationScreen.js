import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllCategories, getFavorites, toggleFavorite } from '../utils/motivations';
import { BookmarkIcon, BookmarkFillIcon } from '../components/Icons';
import { useTheme } from '../theme/ThemeContext';
import { useLocale } from '../i18n/LanguageContext';

export default function MotivationScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const categories = getAllCategories();
  const [activeTab, setActiveTab] = useState('pekerjaan');
  const [activeSub, setActiveSub] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favSet, setFavSet] = useState(new Set());

  useEffect(() => { loadFavorites(); }, []);

  async function loadFavorites() {
    const favs = await getFavorites();
    setFavorites(favs);
    setFavSet(new Set(favs.map(f => f.id)));
  }

  async function handleFavorite(id) {
    await toggleFavorite(id);
    await loadFavorites();
  }

  const current = categories.find(c => c.key === activeTab);
  const showingSub = activeSub || (current?.sub[0]?.key || null);
  const currentSub = current?.sub.find(s => s.key === showingSub);

  const isFavTab = activeTab === '_favorites';
  const s = makeStyles(colors);

  function renderContent(item, small) {
    const isFav = favSet.has(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={s.contentCard}
        onPress={() => setSelectedItem(item)}
        activeOpacity={0.85}
      >
        <View style={s.contentTop}>
          <Text style={s.contentTitle} numberOfLines={small ? 2 : undefined}>{item.title}</Text>
          <TouchableOpacity onPress={() => handleFavorite(item.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            {isFav ? <BookmarkFillIcon color={colors.accent} size={20} /> : <BookmarkIcon color={colors.outline} size={20} />}
          </TouchableOpacity>
        </View>
        {!small && (
          <>
            <Text style={s.contentQuote} numberOfLines={3}>{item.quote}</Text>
            <Text style={s.contentSource}>{item.source}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topDecoration}>
        <View style={s.decoDot} />
        <View style={s.decoDot} />
        <View style={s.decoDot} />
      </View>
      <View style={s.header}>
        <Text style={s.pageTitle}>{t('motivation')}</Text>
      </View>

      <View style={s.tabRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
          {categories.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[s.tab, activeTab === c.key && s.tabActive]}
              onPress={() => { setActiveTab(c.key); setActiveSub(null); }}
            >
              <Text style={[s.tabText, activeTab === c.key && s.tabTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.tab, isFavTab && s.tabActive]}
            onPress={() => setActiveTab('_favorites')}
          >
            <BookmarkIcon color={isFavTab ? colors.onPrimary : colors.outline} size={14} />
            <Text style={[s.tabText, isFavTab && s.tabTextActive]}>Favorit</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {isFavTab ? (
        favorites.length === 0 ? (
          <View style={s.empty}>
            <BookmarkIcon color={colors.outline} size={40} />
            <Text style={s.emptyTitle}>{t('noFavorites')}</Text>
            <Text style={s.emptyHint}>{t('noFavoritesHint')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {favorites.map(item => renderContent(item, false))}
          </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subRow}>
            {current?.sub.map(sub => (
              <TouchableOpacity
                key={sub.key}
                style={[s.subChip, showingSub === sub.key && s.subChipActive]}
                onPress={() => setActiveSub(sub.key)}
              >
                <Text style={[s.subChipText, showingSub === sub.key && s.subChipTextActive]}>{sub.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {currentSub?.items.map(item => renderContent(item, false))}
        </ScrollView>
      )}

      <Modal visible={!!selectedItem} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{selectedItem?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalQuote}>{selectedItem?.quote}</Text>
              <Text style={s.modalSource}>{selectedItem?.source}</Text>
              <View style={s.modalDivider} />
              <Text style={s.modalContent}>{selectedItem?.content}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  topDecoration: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 4, paddingBottom: 2,
  },
  decoDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent, opacity: 0.3,
  },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: c.onSurface },
  tabRow: {
    borderBottomWidth: 1, borderBottomColor: c.borderLight, marginBottom: 4,
  },
  tabScroll: { paddingHorizontal: 12, gap: 4, paddingBottom: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight,
  },
  tabActive: { backgroundColor: c.primary, borderColor: c.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: c.onSurfaceVariant },
  tabTextActive: { color: c.onPrimary },
  list: { padding: 16, paddingBottom: 40 },
  subRow: { gap: 8, marginBottom: 16 },
  subChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight,
  },
  subChipActive: { backgroundColor: c.primaryContainer, borderColor: c.primary },
  subChipText: { fontSize: 12, fontWeight: '500', color: c.onSurfaceVariant },
  subChipTextActive: { color: c.primary, fontWeight: '600' },
  contentCard: {
    backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: c.borderLight,
    ...Platform.select({
      ios: { shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  contentTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
  },
  contentTitle: { fontSize: 16, fontWeight: '600', color: c.onSurface, flex: 1 },
  contentQuote: {
    fontSize: 13, color: c.onSurfaceVariant, fontStyle: 'italic', marginTop: 8, lineHeight: 19,
  },
  contentSource: { fontSize: 11, color: c.accent, marginTop: 4, fontWeight: '500' },
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
  modalQuote: {
    fontSize: 15, color: c.onSurfaceVariant, fontStyle: 'italic', lineHeight: 23,
  },
  modalSource: { fontSize: 12, color: c.accent, marginTop: 6, fontWeight: '500' },
  modalDivider: { height: 1, backgroundColor: c.borderLight, marginVertical: 16 },
  modalContent: { fontSize: 14, color: c.onSurface, lineHeight: 22 },
});
