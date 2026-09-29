import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SeekBar } from '@/components/seekbar';
import { Slider } from '@/components/slider';
import { TrackMenu } from '@/components/track-menu';
import { TrackRow } from '@/components/track-row';
import { RingVisualizer, VinylArtwork } from '@/components/vinyl';
import { colors, fonts, spacing, typography } from '@/constants/theme';
import { useLibrary } from '@/context/library-context';
import { usePlayer } from '@/context/player-context';
import { useSettings } from '@/context/settings-context';
import { useAppStyles } from '@/context/theme-context';
import { artworkInitials, formatTime, hslToHex } from '@/lib/utils';
import type { RepeatMode, Track } from '@/lib/types';

const REPEAT_ICON: Record<RepeatMode, React.ComponentProps<typeof MaterialIcons>['name']> = {
  off: 'repeat',
  all: 'repeat',
  one: 'repeat-one',
};

/** Dernier volume non nul, pour pouvoir rétablir le son après un mute. */
let lastAudibleVolume = 0.85;

function toggleMute(volume: number) {
  if (volume > 0) lastAudibleVolume = volume;
  return volume > 0 ? 0 : lastAudibleVolume;
}

function volumeIconName(volume: number): React.ComponentProps<typeof MaterialIcons>['name'] {
  if (volume <= 0) return 'volume-off';
  if (volume < 0.34) return 'volume-down';
  if (volume < 0.7) return 'volume-up';
  return 'volume-up';
}

function repeatLabel(mode: RepeatMode) {
  if (mode === 'one') return 'Répéter la piste';
  if (mode === 'all') return 'Répéter le tout';
  return 'Répéter : désactivé';
}

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const library = useLibrary();
  const player = usePlayer();
  const settings = useSettings();
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const track = player.currentTrack;
  const queueTracks = useMemo(
    () =>
      player.queue
        .map((tid) => library.tracks.find((t) => t.id === tid))
        .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [player.queue, library.tracks]
  );

  if (!track) {
    return (
      <View style={styles.root}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={10}>
          <MaterialIcons name="keyboard-arrow-down" size={26} color={colors.onSurface} />
        </Pressable>
      </View>
    );
  }

  const nextUp = queueTracks.slice(player.queueIndex + 1);

  const currentTime = player.position;
  const duration = player.duration || track.duration || 0;

  const jumpTo = (tid: string) => {
    const idx = player.queue.indexOf(tid);
    if (idx < 0) return;
    const order = [...player.queue];
    const reordered = [...order.slice(idx), ...order.slice(0, idx)];
    player.playQueue(reordered, tid);
  };

  const initials = artworkInitials(track);

  const muted = settings.volume <= 0;
  const volumeIcon = volumeIconName(settings.volume);

  return (
    <LinearGradient
      colors={[
        hslToHex(track.hue, 60, 14),
        colors.background,
        colors.background,
      ]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.9 }}
      style={styles.root}>
      <View style={{ paddingTop: insets.top + spacing.sm }}>
        <View style={styles.bar}>
          <Pressable style={styles.roundBtn} onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="keyboard-arrow-down" size={26} color={colors.onSurface} />
          </Pressable>
          <View style={styles.barCenter}>
            <Text style={styles.barTitle}>En lecture</Text>
            <Text style={styles.barSub}>{queueTracks.length} dans la file</Text>
          </View>
          <Pressable style={styles.roundBtn} onPress={() => setMenuTrack(track)} hitSlop={8}>
            <MaterialIcons name="more-vert" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}>
        {/* Piste */}
        <View style={styles.artWrap}>
          <RingVisualizer playing={player.isPlaying} size={280} color={hslToHex(track.hue, 80, 62)} />
          <VinylArtwork playing={player.isPlaying} hue={track.hue} initials={initials} size={280} />
          <Pressable style={styles.favBtn} onPress={() => library.toggleFavorite(track.id)} hitSlop={6}>
            <MaterialIcons
              name="favorite"
              size={22}
              color={track.favorite ? colors.favorite : colors.onSurface}
              style={track.favorite ? { textShadowColor: colors.favorite, textShadowRadius: 8 } : undefined}
            />
          </Pressable>
        </View>

        <View style={styles.meta}>
          <Text style={[typography.headlineLgMobile, styles.title]} numberOfLines={2}>
            {track.title}
          </Text>
          <Text style={styles.artist}>
            {track.artist}
            {track.album ? ` • ${track.album}` : ''}
          </Text>
        </View>

        {/* Barre de progression */}
        <View style={styles.progress}>
          <SeekBar
            progress={duration > 0 ? currentTime / duration : 0}
            duration={duration}
            onSeek={player.seekTo}
          />
          <View style={styles.times}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Contrôles */}
        <View style={styles.controls}>
          <Pressable style={styles.modeBtn} onPress={player.toggleShuffle} hitSlop={6}>
            <MaterialIcons
              name="shuffle"
              size={22}
              color={player.shuffle ? colors.secondary : colors.onSurfaceVariant}
            />
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={player.skipPrevious} hitSlop={6}>
            <MaterialIcons name="skip-previous" size={32} color={colors.onSurface} />
          </Pressable>
          <Pressable style={styles.playBtn} onPress={player.togglePlay} hitSlop={6}>
            <MaterialIcons name={player.isPlaying ? 'pause' : 'play-arrow'} size={34} color={colors.onPrimary} />
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={player.skipNext} hitSlop={6}>
            <MaterialIcons name="skip-next" size={32} color={colors.onSurface} />
          </Pressable>
          <Pressable style={styles.modeBtn} onPress={player.cycleRepeat} hitSlop={6}>
            <MaterialIcons
              name={REPEAT_ICON[player.repeat]}
              size={22}
              color={player.repeat === 'off' ? colors.onSurfaceVariant : colors.secondary}
            />
          </Pressable>
        </View>
        <Text style={[typography.labelSm, styles.repeatHint, { textTransform: 'uppercase' }]}>
          {repeatLabel(player.repeat)}
        </Text>

        {/* Volume */}
        <View style={styles.volumeRow}>
          <Pressable
            style={styles.volumeBtn}
            hitSlop={8}
            onPress={() => settings.update({ volume: toggleMute(settings.volume) })}
            accessibilityLabel={muted ? 'Réactiver le son' : 'Couper le son'}>
            <MaterialIcons
              name={volumeIcon}
              size={20}
              color={muted ? colors.outline : colors.onSurfaceVariant}
            />
          </Pressable>
          <View style={styles.volumeSlider}>
            <Slider
              value={settings.volume}
              onValueChange={(v) => settings.update({ volume: v })}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.stroke}
              thumbTintColor={colors.onSurface}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
            />
          </View>
          <Text style={styles.volumeValue}>{Math.round(settings.volume * 100)}</Text>
        </View>

        {/* File d'attente */}
        {nextUp.length ? (
          <View style={styles.queue}>
            <View style={styles.queueHeader}>
              <MaterialIcons name="queue-music" size={18} color={colors.primary} />
              <Text style={[typography.headlineSm, styles.queueTitle]}>
                À suivre ({nextUp.length})
              </Text>
            </View>
            {nextUp.slice(0, 8).map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                index={player.queueIndex + 1 + i}
                onPress={() => jumpTo(t.id)}
                onFavorite={() => library.toggleFavorite(t.id)}
                onMore={() => setMenuTrack(t)}
                showAlbum
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <TrackMenu track={menuTrack} visible={Boolean(menuTrack)} onClose={() => setMenuTrack(null)} />
    </LinearGradient>
  );
}

const createStyles = () => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeBtn: {
    margin: spacing.md,
    alignSelf: 'flex-start',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  barCenter: {
    alignItems: 'center',
  },
  barTitle: {
    color: colors.onSurface,
    fontFamily: fonts.headlineSemi,
    fontSize: 15,
  },
  barSub: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 1,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  artWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  favBtn: {
    position: 'absolute',
    right: spacing.md + 8,
    bottom: spacing.md + 8,
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,22,30,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  meta: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.headline,
    textAlign: 'center',
  },
  artist: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    textAlign: 'center',
  },
  progress: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  modeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gradientStart,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: colors.electricViolet,
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  repeatHint: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  volumeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeSlider: {
    flex: 1,
  },
  volumeValue: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 26,
    textAlign: 'right',
  },
  queue: {
    marginTop: spacing.xl,
    gap: 2,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  queueTitle: {
    color: colors.onSurface,
    fontFamily: fonts.headlineSemi,
  },
});