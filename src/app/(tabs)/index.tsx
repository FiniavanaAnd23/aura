import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/artwork';
import { Copyright } from '@/components/copyright';
import { EmptyState } from '@/components/empty-state';
import { FadeUp } from '@/components/motion';
import { PrimaryButton } from '@/components/primary-button';
import { SectionHeader } from '@/components/section-header';
import { TrackMenu } from '@/components/track-menu';
import { TrackRow } from '@/components/track-row';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useLibrary } from '@/context/library-context';
import { usePlayer } from '@/context/player-context';
import { useAppStyles } from '@/context/theme-context';
import { artistSummary, quickPlays } from '@/lib/discover';
import { greeting, hashHue, titleCount, trackInitials } from '@/lib/utils';
import type { Track } from '@/lib/types';

function sessionBadge() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { label: 'Flux Matinal', hue: 190 };
  if (h >= 12 && h < 18) return { label: 'Flux Diurne', hue: 265 };
  if (h >= 18 && h < 23) return { label: 'Flux Vespéral', hue: 315 };
  return { label: 'Flux Nocturne', hue: 235 };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const library = useLibrary();
  const player = usePlayer();
  const [importing, setImporting] = useState(false);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const badge = sessionBadge();
  const tracks = library.tracks;
  const quick = useMemo(() => quickPlays(tracks), [tracks]);
  const artists = useMemo(() => artistSummary(tracks, 8), [tracks]);

  const trends = useMemo(() => {
    const withPlays = [...tracks].sort((a, b) => b.playCount - a.playCount);
    const edges = withPlays.filter((t) => t.playCount > 0);
    const source = edges.length ? edges : [...tracks].sort((a, b) => b.addedAt - a.addedAt);
    return source.slice(0, 5);
  }, [tracks]);

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await library.importAudio();
      if (result.canceled) return;
      Alert.alert(
        result.added ? 'Import terminé' : 'Rien de nouveau',
        result.added
          ? result.added > 1
            ? `${result.added} titres ajoutés à votre bibliothèque.`
            : '1 titre ajouté à votre bibliothèque.'
          : 'Ces morceaux sont déjà présents dans votre bibliothèque.'
      );
    } finally {
      setImporting(false);
    }
  };

  const playCollection = (list: Track[], startId?: string) => {
    player.playQueue(
      list.map((t) => t.id),
      startId
    );
    router.push('/player');
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: 160 + insets.bottom },
      ]}
      showsVerticalScrollIndicator={false}>
      {/* Salutation & badge */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: badge.hue === 235 ? colors.secondary : colors.primary }]} />
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.recentPill}
            onPress={() => router.push('/library')}
            hitSlop={8}
            disabled={!tracks.length}>
            <MaterialIcons name="history" size={15} color={colors.onSurfaceVariant} />
            <Text style={styles.recentText}>Récents</Text>
          </Pressable>
          <Pressable style={styles.gearBtn} onPress={() => router.push('/settings')} hitSlop={8}>
            <MaterialIcons name="settings" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>
      <FadeUp>
        <View style={styles.hero}>
          <Text style={[typography.headlineLgMobile, styles.heroTitle]}>{greeting()}</Text>
          <Text style={[typography.bodyMd, styles.heroSub]}>
            {tracks.length ? 'Prêt pour votre session ?' : 'Importez votre musique pour commencer'}
          </Text>
        </View>
      </FadeUp>

      {!tracks.length ? (
        <FadeUp index={1}>
          <EmptyState
            icon="library-music"
            title="Votre bibliothèque est vide"
            message="Ajoutez vos morceaux locaux : ils seront copiés sur votre appareil et lisibles hors ligne.">
            <PrimaryButton label="Importer de la musique" icon="file-download" onPress={handleImport} loading={importing} />
          </EmptyState>
        </FadeUp>
      ) : (
        <>
          {/* Reprendre la lecture */}
          <FadeUp index={1}>
            <SectionHeader title="Reprendre la lecture" eyebrow="Raccourcis" />
          </FadeUp>
          <FadeUp index={2}>
            <View style={styles.grid}>
            {quick.slice(0, 6).map((q) => {
              return (
                <Pressable
                  key={q.id}
                  style={({ pressed }) => [styles.qCard, pressed && styles.pressed]}
                  onPress={() => playCollection(q.tracks)}>
                  <Artwork hue={q.hue} initials={trackInitials(q.title)} size={44} radiusValue={radius.sm} iconSize={18} />
                  <View style={styles.qText}>
                    <Text numberOfLines={1} style={[typography.bodyMd, styles.qTitle]}>
                      {q.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.qSub}>
                      {q.subtitle}
                    </Text>
                  </View>
                  <View style={styles.qPlay}>
                    <MaterialIcons name="play-arrow" size={18} color={colors.onPrimary} />
                  </View>
                </Pressable>
              );
            })}
            </View>
          </FadeUp>

          {/* Conçu pour vous */}
          <FadeUp index={3}>
            <SectionHeader
              title="Conçu pour vous"
              eyebrow="Découverte"
              leadingIcon={<MaterialIcons name="auto-awesome" size={20} color={colors.primary} />}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
              {quick.slice(1, 7).map((q) => (
                <Pressable
                  key={q.id}
                  style={({ pressed }) => [styles.albumCard, pressed && styles.pressed]}
                  onPress={() => playCollection(q.tracks, q.tracks[0]?.id)}>
                  <View style={styles.albumArt}>
                    <Artwork hue={q.hue} initials={trackInitials(q.title)} size={148} radiusValue={radius.md} iconSize={40} />
                    <View style={styles.albumPlay}>
                      <MaterialIcons name="play-arrow" size={22} color={colors.onPrimary} />
                    </View>
                  </View>
                  <Text numberOfLines={1} style={[typography.bodyMd, styles.albumTitle]}>
                    {q.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.albumSub}>
                    {q.subtitle} • {titleCount(q.tracks.length)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </FadeUp>

          {/* Artistes favoris */}
          {artists.length ? (
            <>
              <FadeUp index={4}>
                <SectionHeader
                  title="Vos artistes favoris"
                  eyebrow="En direct"
                  right={
                    <View style={styles.liveRow}>
                      <MaterialIcons name="graphic-eq" size={13} color={colors.secondary} />
                      <Text style={styles.liveText}>{artists.length} artistes</Text>
                    </View>
                  }
                />
              <View style={styles.artistGrid}>
                  {artists.map((a) => (
                    <Pressable
                      key={a.artist}
                      style={styles.artistItem}
                      onPress={() => playCollection(a.tracks, a.tracks[0]?.id)}>
                      <View style={styles.artistRing}>
                        <Artwork hue={hashHue(a.artist)} initials={trackInitials(a.artist)} size={58} radiusValue={999} iconSize={22} />
                      </View>
                      <Text numberOfLines={1} style={[typography.bodySm, styles.artistName]}>
                        {a.artist}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </FadeUp>
            </>
          ) : null}

          {/* Tendances de la semaine */}
          {trends.length ? (
            <>
              <FadeUp index={5}>
                <SectionHeader
                  title="Tendances de la semaine"
                  eyebrow="Vos écoutes"
                  leadingIcon={<MaterialIcons name="local-fire-department" size={20} color={colors.secondary} />}
                  actionLabel="Tout voir"
                  onAction={() => router.push('/library')}
                />
              </FadeUp>
              <FadeUp index={6}>
                <View style={styles.trendList}>
                  {trends.map((track, i) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={i}
                      isCurrent={player.currentTrack?.id === track.id}
                      isPlaying={player.isPlaying}
                      onPress={() => playCollection(tracks, track.id)}
                      onFavorite={() => library.toggleFavorite(track.id)}
                      onMore={() => setMenuTrack(track)}
                    />
                  ))}
                </View>
              </FadeUp>
            </>
          ) : null}
        </>
      )}
      <FadeUp index={7}>
        <Copyright />
      </FadeUp>
      <TrackMenu track={menuTrack} visible={Boolean(menuTrack)} onClose={() => setMenuTrack(null)} />
    </ScrollView>
  );
}

const createStyles = () => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fonts.bodySemi,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  recentText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: fonts.bodySemi,
    letterSpacing: 0.4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gearBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  hero: {
    gap: 2,
  },
  heroTitle: {
    color: colors.onSurface,
    fontFamily: fonts.headline,
  },
  heroSub: {
    color: colors.onSurfaceVariant,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  qCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  qText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  qTitle: {
    color: colors.onSurface,
    fontFamily: fonts.bodySemi,
  },
  qSub: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  qPlay: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.gradientStart,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hRow: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  albumCard: {
    width: 148,
    gap: spacing.xs,
  },
  albumArt: {},
  albumPlay: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.gradientEnd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumTitle: {
    color: colors.onSurface,
    fontFamily: fonts.bodySemi,
  },
  albumSub: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  artistItem: {
    width: '21%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  artistRing: {
    borderRadius: 999,
    padding: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(160,120,255,0.35)',
  },
  artistName: {
    color: colors.onSurface,
    textAlign: 'center',
  },
  trendList: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLow,
  },
});