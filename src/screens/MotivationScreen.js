import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, StatusBar,
  Dimensions, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText, G, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { DownloadIcon, BookmarkIcon, BookmarkFillIcon } from '../components/Icons';
import {
  getCategories, getCategoryLabel,
  getFavIds, toggleFavorite,
  getFavorites, fetchBatch,
} from '../utils/motivations';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const PAGE_SIZE = 4;

// full-resolution wallpaper for display + download
const FULL_W = Math.round(SCREEN_W);
const FULL_H = Math.round(SCREEN_H);

// themed image keywords per category (loremflickr matches by keyword)
const THEME_KEYWORDS = {
  pekerjaan: 'office,business',
  keluarga: 'family,home',
  umum: 'nature,landscape',
  ibadah: 'mosque,islam',
};

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getWallpaperUrl(item) {
  const kw = THEME_KEYWORDS[item.cat] || THEME_KEYWORDS.umum;
  const lock = simpleHash(item.id || 'umum') % 999;
  return `https://loremflickr.com/${FULL_W}/${FULL_H}/${kw}?lock=${lock}`;
}

function getFallbackWallpaperUrl(item) {
  const base = item.id || 'umum';
  return `https://picsum.photos/seed/${base}/${FULL_W}/${FULL_H}`;
}

// adaptive quote font size based on text length
function getQuoteStyle(text) {
  const len = (text || '').length;
  let fontSize = 20;
  if (len >= 60) fontSize = 18;
  if (len >= 120) fontSize = 16;
  if (len >= 200) fontSize = 15;
  if (len >= 300) fontSize = 14;
  if (len >= 450) fontSize = 13;
  return { fontSize, lineHeight: Math.round(fontSize * 1.5) };
}

// ---- offscreen SVG quote-pin generator (download) ----
const PIN_W = 1080;
const PIN_H = 1620;

// on-screen preview size for the download overlay (design stays 1080x1620
// via viewBox; the preview just needs to be big enough for a crisp capture)
const PREVIEW_W = Math.min(SCREEN_W - 32, 420);
const PREVIEW_H = Math.round(PREVIEW_W * (PIN_H / PIN_W));

// theme gradient per category — pure vector (no photo in the pin; the
// photo wallpaper caused native OOM when embedded in the export)
const THEME_GRADIENTS = {
  pekerjaan: { top: '#2b3a67', bottom: '#0d1226' },
  keluarga: { top: '#6b2b3f', bottom: '#1c0d14' },
  ibadah: { top: '#1f5c47', bottom: '#081a12' },
  umum: { top: '#4a2b6b', bottom: '#160b24' },
};

function wrapText(text, charsPerLine) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length > charsPerLine && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function getPinFontSize(len) {
  if (len < 60) return 60;
  if (len < 120) return 52;
  if (len < 200) return 44;
  if (len < 300) return 38;
  return 34;
}

export default function MotivationScreen() {
  const cats = getCategories();
  const listRef = useRef(null);
  const svgRef = useRef(null);
  const [svgItem, setSvgItem] = useState(null);
  const [items, setItems] = useState([]);
  const [favIds, setFavIdsState] = useState(new Set());
  const [favItems, setFavItems] = useState([]);
  const [activeTab, setActiveTab] = useState(cats[0]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [dlPending, setDlPending] = useState({});
  const [imgFail, setImgFail] = useState({});
  const mounted = useRef(true);
  const [viewportH, setViewportH] = useState(SCREEN_H);

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

  async function handleFav(item) {
    await toggleFavorite(item);
    await loadFavs();
  }

  async function handleDownload(item) {
    const id = item.id;
    setDlPending(prev => ({ ...prev, [id]: true }));
    try {
      const media = require('expo-media-library');
      const fs = require('expo-file-system/legacy');

      const perm = await media.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Izin dibutuhkan', 'Berikan izin akses media untuk menyimpan gambar');
        return;
      }

      // mount the pin VISIBLY in an overlay — a visible view is already
      // rendered (cached bitmap exists), so the capture never races the
      // SVG renderer the way toDataURL did (blank exports on this stack)
      setSvgItem(item);
      await new Promise(resolve => {
        const t0 = Date.now();
        (function check() {
          if (svgRef.current) return resolve();
          if (Date.now() - t0 > 2000) return resolve();
          setTimeout(check, 50);
        })();
      });
      // let the first frame actually draw before capturing
      await new Promise(r => setTimeout(r, 400));

      // capture the visible pin via react-native-view-shot — snapshots the
      // already-rendered view, upscaled to the target pin resolution
      const viewShot = require('react-native-view-shot');
      const uri = await new Promise((resolve, reject) => {
        let attempts = 0;
        const attempt = () => {
          viewShot
            .captureRef(svgRef.current, {
              format: 'png',
              quality: 1,
              result: 'tmpfile',
              width: PIN_W,
              height: PIN_H,
            })
            .then(resolve)
            .catch(e => {
              if (attempts < 1) {
                attempts++;
                setTimeout(attempt, 300);
              } else {
                reject(new Error(`langkah 1: capture gagal (${e.message})`));
              }
            });
        };
        attempt();
      });

      // view-shot tmpfiles have no extension — copy to a .png path so the
      // gallery detects the MIME type correctly, then verify it's non-empty
      const fileUri = fs.cacheDirectory + `misykat-${id}-${Date.now()}.png`;
      await fs.copyAsync({ from: uri, to: fileUri });
      const info = await fs.getInfoAsync(fileUri);
      if (!info || !info.exists || info.size <= 0) throw new Error('langkah 2: hasil capture kosong');

      // save to gallery — createAssetAsync is the most reliable on
      // Android 10+ (write-only MediaStore contribution, no read
      // permission needed, lands directly in gallery); fall back to
      // saveToLibraryAsync only if it throws
      try {
        await media.createAssetAsync(fileUri);
      } catch {
        await media.saveToLibraryAsync(fileUri);
      }
      Alert.alert('Tersimpan', 'Gambar quote tersimpan ke galeri');
    } catch (e) {
      Alert.alert(
        'Gagal',
        'Tidak dapat menyimpan gambar' + (e && e.message ? `\n(${e.message})` : '')
      );
    } finally {
      // unmount the preview overlay
      setSvgItem(null);
      if (mounted.current) setDlPending(prev => ({ ...prev, [id]: false }));
    }
  }

  const isFavTab = activeTab === '_fav';

  function renderPage(item, isFromFav) {
    const isFavd = favIds.has(item.id);
    const imgUrl = imgFail[item.id] ? getFallbackWallpaperUrl(item) : getWallpaperUrl(item);
    const loadingDl = dlPending[item.id];
    const text = item.quote || item.ayat || item.text || '';
    const source = item.source || item.surah || '';
    const title = item.title || '';
    const sub = item.sub || '';
    const qStyle = getQuoteStyle(text);

    return (
      <View style={[s.page, { height: viewportH }]}>
        {/* on-screen pin (display only) */}
        <View style={s.pin}>
          <Image
            source={{ uri: imgUrl }}
            style={s.bgImg}
            resizeMode="cover"
            fadeDuration={0}
            onError={() => {
              if (!imgFail[item.id]) setImgFail(prev => ({ ...prev, [item.id]: true }));
            }}
          />
          <View style={s.overlay}>
            <View style={s.pinContent}>
              {sub ? (
                <View style={s.subPill}><Text style={s.subPillText}>{sub}</Text></View>
              ) : null}
              <Text style={s.quoteIcon}>"</Text>
              <Text style={[s.quoteText, qStyle]}>{text}</Text>
              {source ? <Text style={s.sourceText}>{source}</Text> : null}
              {title && title !== source ? (
                <Text style={s.titleText} numberOfLines={1}>{title}</Text>
              ) : null}
              <View style={s.watermark}>
                <Text style={s.watermarkText}>MISYKAT</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Interactive UI — outside the pin */}
        <TouchableOpacity
          style={s.favBtn}
          onPress={() => handleFav(item)}
          hitSlop={12}
        >
          {isFavd
            ? <BookmarkFillIcon color="#FFD700" size={22} />
            : <BookmarkIcon color="rgba(255,255,255,0.8)" size={22} />
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={s.dlBtn}
          onPress={() => handleDownload(item)}
          disabled={!!loadingDl}
          activeOpacity={0.7}
        >
          {loadingDl ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <DownloadIcon size={18} color="rgba(255,255,255,0.9)" />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  function renderPinSvg(item, w, h) {
    const text = item.quote || '';
    const source = item.source || '';
    const title = item.title || '';
    const sub = item.sub || '';
    const fontSize = getPinFontSize(text.length);
    const lh = Math.round(fontSize * 1.4);
    const charsPerLine = Math.max(10, Math.floor((PIN_W - 180) / (fontSize * 0.6)));
    const lines = wrapText(text, charsPerLine);
    const blockH = lines.length * lh;
    const blockStart = 600;
    const pillW = Math.max(100, sub.length * 26 + 70);
    const g = THEME_GRADIENTS[item.cat] || THEME_GRADIENTS.umum;

    return (
      <Svg
        ref={svgRef}
        width={w}
        height={h}
        viewBox={`0 0 ${PIN_W} ${PIN_H}`}
      >
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={g.top} />
            <Stop offset="1" stopColor={g.bottom} />
          </LinearGradient>
          <RadialGradient id="glow" cx="50%" cy="42%" r="62%">
            <Stop offset="0" stopColor="rgba(255,255,255,0.10)" />
            <Stop offset="1" stopColor="rgba(255,255,255,0)" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={PIN_W} height={PIN_H} fill="url(#bg)" />
        <Rect x={0} y={0} width={PIN_W} height={PIN_H} fill="url(#glow)" />
        {sub ? (
          <G>
            <Rect
              x={(PIN_W - pillW) / 2} y={340} width={pillW} height={60} rx={30}
              fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.30)" strokeWidth={2}
            />
            <SvgText
              x={PIN_W / 2} y={380} textAnchor="middle" fontSize={28}
              fontWeight="700" fill="#fff" letterSpacing={3}
            >
              {String(sub).toUpperCase()}
            </SvgText>
          </G>
        ) : null}
        <SvgText
          x={PIN_W / 2} y={470} textAnchor="middle" fontSize={120}
          fontWeight="700" fill="rgba(255,255,255,0.18)"
        >
          "
        </SvgText>
        {lines.map((ln, i) => (
          <SvgText
            key={i}
            x={PIN_W / 2} y={blockStart + i * lh}
            textAnchor="middle" fontSize={fontSize} fill="#fff"
            fontStyle="italic" fontWeight="400"
          >
            {ln}
          </SvgText>
        ))}
        {source ? (
          <SvgText
            x={PIN_W / 2} y={blockStart + blockH + 64} textAnchor="middle"
            fontSize={30} fill="rgba(255,255,255,0.75)" fontWeight="500"
          >
            {source}
          </SvgText>
        ) : null}
        {title && title !== source ? (
          <SvgText
            x={PIN_W / 2} y={blockStart + blockH + 116} textAnchor="middle"
            fontSize={26} fill="rgba(255,255,255,0.5)"
          >
            {title}
          </SvgText>
        ) : null}
        <Rect
          x={(PIN_W - 240) / 2} y={PIN_H - 130} width={240} height={50} rx={25}
          fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.20)" strokeWidth={2}
        />
        <SvgText
          x={PIN_W / 2} y={PIN_H - 98} textAnchor="middle" fontSize={24}
          fontWeight="700" fill="rgba(255,255,255,0.65)" letterSpacing={8}
        >
          MISYKAT
        </SvgText>
      </Svg>
    );
  }

  return (
    <View
      style={s.root}
      onLayout={e => setViewportH(Math.round(e.nativeEvent.layout.height))}
    >
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
        <View style={[s.page, { height: viewportH, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.4)" />
        </View>
      ) : isFavTab ? (
        favItems.length === 0 ? (
          <View style={[s.page, { height: viewportH, backgroundColor: '#0d0d0d' }]}>
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

      {/* download preview overlay — the pin renders VISIBLY here, then
          gets captured by react-native-view-shot */}
      {svgItem ? (
        <View style={s.dlOverlay}>
          <View style={s.dlCard}>
            {renderPinSvg(svgItem, PREVIEW_W, PREVIEW_H)}
          </View>
          <View style={s.dlStatus}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
            <Text style={s.dlStatusText}>Menyimpan gambar…</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  page: { width: SCREEN_W },
  pin: { flex: 1 },
  bgImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pinContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, paddingBottom: 48,
  },
  subPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 20,
  },
  subPillText: {
    fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  quoteIcon: {
    fontSize: 48, color: 'rgba(255,255,255,0.25)', fontWeight: '700',
    marginBottom: -14, lineHeight: 56,
  },
  quoteText: {
    color: '#fff', fontWeight: '400',
    letterSpacing: 0.2, fontStyle: 'italic',
    textAlign: 'center',
  },
  sourceText: {
    fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 20,
    fontWeight: '500', textAlign: 'center',
  },
  titleText: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8,
    fontWeight: '400', textAlign: 'center',
  },
  watermark: {
    position: 'absolute', bottom: 36, alignSelf: 'center',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  watermarkText: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)',
    letterSpacing: 3,
  },
  favBtn: {
    position: 'absolute', top: 76, right: 20, zIndex: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  dlBtn: {
    position: 'absolute', right: 24, bottom: 56, zIndex: 20,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
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
  footer: { height: 120, justifyContent: 'center', alignItems: 'center' },
  dlOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  dlCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  dlStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dlStatusText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
