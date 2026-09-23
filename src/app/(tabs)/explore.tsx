import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/artwork';
import { Copyright } from '@/components/copyright';
import { EmptyState } from '@/components/empty-state';
import { FadeUp } from '@/components/motion';
import { SectionHeader } from '@/components/section-header';
import { TrackMenu } from '@/components/track-menu';
import { TrackRow } from '@/components/track-row';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useLibrary } from '@/context/library-context';
import { usePlayer } from '@/context/player-context';
import { useAppStyles } from '@/context/theme-context';
import { albumSummary, artistSummary, searchTracks } from '@/lib/discover';
import { KEYS, loadRawJSON, saveJSON } from '@/lib/storage';
import { formatTime, titleCount, trackInitials } from '@/lib/utils';
import type { Track } from '@/lib/types';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const library = useLibrary();
  const player = usePlayer();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  useEffect(() => {
    loadRawJSON<string[]>(KEYS.recentSearches, []).then((r) => setRecent((prev) => (prev.length ? prev : r)));
  }, []);

  const trimmed = query.trim();
  const results = useMemo(
    () => (trimmed ? searchTracks(library.tracks, trimmed) : []),
    [library.tracks, trimmed]
  );
  const artists = useMemo(() => artistSummary(library.tracks, 12), [library.tracks]);
  const albums = useMemo(() => albumSummary(library.tracks, 12), [library.tracks]);

  useEffect(() => {
    if (!trimmed) return;
    const t = setTimeout(() => {
      setRecent((prev) => {
        const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 8);
        saveJSON(KEYS.recentSearches, next);
        return next;
      });
    }, 900);
    return () => clearTimeout(t);
  }, [trimmed]);

  const clearRecent = () => {
    setRecent([]);
    saveJSON(KEYS.recentSearches, []);
  };

  const playNow = (list: Track[]) => {
    if (!list.length) return;
    player.playQueue(list.map((t) => t.id));
    router.push('/player');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: 160 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <FadeUp>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoLetter}>A</Text>
            </View>
            <View style={styles.brandText}>
              <Text style={[typography.headlineSm, { color: colors.onSurface, fontFamily: fonts.headlineSemi }]}>
                Explorer
              </Text>
              <Text style={styles.brandSub}>Cherchez dans vos musiques</Text>
            </View>
          </View>
        </FadeUp>

        <FadeUp index={1}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={colors.outline} />
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Titres, artistes, albums..."
              placeholderTextColor={colors.onSurfaceVariant}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={colors.primary}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={colors.outline} />
              </Pressable>
            ) : null}
          </View>
        </FadeUp>

        {trimmed ? (
          <FadeUp index={2}>
            <View style={styles.resultBlock}>
              <SectionHeader
                title={results.length ? `${results.length} résultat${results.length > 1 ? 's' : ''}` : 'Aucun résultat'}
                eyebrow="Recherche"
              />
              {results.map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  isCurrent={player.currentTrack?.id === track.id}
                  isPlaying={player.isPlaying}
                  onPress={() => {
                    player.playQueue(results.map((t) => t.id), track.id);
                    router.push('/player');
                  }}
                  onFavorite={() => library.toggleFavorite(track.id)}
                  onMore={() => setMenuTrack(track)}
                  showAlbum
                />
              ))}
            </View>
          </FadeUp>
        ) : (
          <>
            {recent.length ? (
              <FadeUp index={2}>
                <View style={styles.block}>
                  <SectionHeader
                    title="Récemment recherché"
                    eyebrow="Historique"
                    right={
                      <Pressable onPress={clearRecent} hitSlop={8}>
                        <Text style={[typography.labelMd, { color: colors.onSurfaceVariant }]}>Effacer</Text>
                      </Pressable>
                    }
                  />
                  <View style={styles.chips}>
                    {recent.map((s) => (
                      <Pressable key={s} style={styles.chip} onPress={() => setQuery(s)}>
                        <MaterialIcons name="history" size={14} color={colors.onSurfaceVariant} />
                        <Text style={styles.chipText} numberOfLines={1}>
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </FadeUp>
            ) : null}

            {artists.length ? (
              <FadeUp index={3}>
                <View style={styles.block}>
                  <SectionHeader
                    title="Vos artistes"
                    eyebrow="Artistes"
                    actionLabel="Tout lire"
                    onAction={() => playNow(library.tracks)}
                  />
                  <View style={styles.artistGrid}>
                    {artists.map((a) => (
                      <Pressable
                        key={a.artist}
                        style={({ pressed }) => [styles.artistCard, pressed && styles.pressed]}
                        onPress={() => playNow(a.tracks)}>
                        <Artwork hue={a.tracks[0].hue} initials={trackInitials(a.artist)} size={64} radiusValue={radius.md} iconSize={22} />
                        <Text numberOfLines={1} style={[typography.bodyMd, styles.artistName]}>
                          {a.artist}
                        </Text>
                        <Text numberOfLines={1} style={styles.artistSub}>
                          {titleCount(a.tracks.length)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </FadeUp>
            ) : null}

            {albums.length ? (
              <FadeUp index={4}>
                <View style={styles.block}>
                  <SectionHeader title="Vos albums" eyebrow="Albums" />
                  <View style={styles.albumList}>
                    {albums.map((a) => (
                      <Pressable
                        key={`${a.album}\u0000${a.artist}`}
                        style={({ pressed }) => [styles.albumCard, pressed && styles.pressed]}
                        onPress={() => playNow(a.tracks)}>
                        <Artwork hue={a.hue} initials={trackInitials(a.album)} size={52} radiusValue={radius.sm} iconSize={18} />
                        <View style={styles.albumText}>
                          <Text numberOfLines={1} style={[typography.bodyMd, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                            {a.album}
                          </Text>
                          <Text numberOfLines={1} style={styles.albumMeta}>
                            {a.artist} • {titleCount(a.tracks.length)} • {formatTime(a.tracks.reduce((s, t) => s + (t.duration ?? 0), 0))}
                          </Text>
                        </View>
                        <View style={styles.chevron}>
                          <MaterialIcons name="play-arrow" size={18} color={colors.primary} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </FadeUp>
            ) : null}

            {!library.tracks.length ? (
              <FadeUp index={3}>
                <EmptyState
                  icon="search"
                  title="Rien à explorer pour l'instant"
                  message="Importez des fichiers ou analysez les sons du téléphone depuis l'onglet Bibliothèque."
                />
              </FadeUp>
            ) : null}
          </>
        )}

        <FadeUp index={6}>
          <Copyright />
        </FadeUp>
      </ScrollView>

      <TrackMenu track={menuTrack} visible={Boolean(menuTrack)} onClose={() => setMenuTrack(null)} />
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gradientStart,
    transform: [{ rotate: '-6deg' }],
  },
  logoLetter: {
    color: colors.onPrimary,
    fontFamily: fonts.headline,
    fontSize: 20,
  },
  brandText: {
    gap: 0,
  },
  brandSub: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  resultBlock: {
    gap: spacing.xs,
  },
  block: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  artistCard: {
    width: '30%',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  artistName: {
    color: colors.onSurface,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  artistSub: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },
  albumList: {
    gap: spacing.sm,
  },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  albumText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  albumMeta: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(160,120,255,0.12)',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  chipText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    maxWidth: 180,
  },
});