import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Artwork } from '@/components/artwork';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { usePlayer } from '@/context/player-context';
import { useAppStyles, useTheme } from '@/context/theme-context';
import { artworkInitials } from '@/lib/utils';

type Props = {
  bottom?: number;
  style?: object;
};

export function MiniPlayer({ bottom = 0, style }: Props) {
  const styles = useAppStyles(createStyles);
  const { mode } = useTheme();
  const player = usePlayer();
  const router = useRouter();
  if (!player.currentTrack) return null;

  const { currentTrack, isPlaying, togglePlay, skipPrevious, skipNext, duration, position } = player;
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <View style={[styles.wrap, { bottom }, style]}>
      <BlurView intensity={mode === 'light' ? 80 : 48} tint={mode === 'light' ? 'light' : 'dark'} style={styles.blur}>
        <Pressable style={styles.pressable} onPress={() => router.push('/player')}>
          <Artwork hue={currentTrack.hue} initials={artworkInitials(currentTrack)} size={42} radiusValue={radius.sm} iconSize={16} />
          <View style={styles.meta}>
            <Text numberOfLines={1} style={[typography.bodyMd, styles.title]}>
              {currentTrack.title}
            </Text>
            <Text numberOfLines={1} style={[typography.bodySm, styles.artist]}>
              {currentTrack.artist}
            </Text>
          </View>
          <View style={styles.actions}>
            <Pressable hitSlop={10} onPress={skipPrevious} style={styles.iconBtn}>
              <MaterialIcons name="skip-previous" size={26} color={colors.onSurface} />
            </Pressable>
            <Pressable hitSlop={10} onPress={togglePlay} style={styles.iconBtn}>
              <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={30} color={colors.onSurface} />
            </Pressable>
            <Pressable hitSlop={10} onPress={skipNext} style={styles.iconBtn}>
              <MaterialIcons name="skip-next" size={26} color={colors.onSurface} />
            </Pressable>
          </View>
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </BlurView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.stroke,
    elevation: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  blur: {
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.bodySemi,
  },
  artist: {
    color: colors.onSurfaceVariant,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 2,
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.stroke,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.primary,
  },
});