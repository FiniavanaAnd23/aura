import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Artwork } from '@/components/artwork';
import { Equalizer } from '@/components/equalizer';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useAppStyles } from '@/context/theme-context';
import { formatTime, trackInitials } from '@/lib/utils';
import type { Track } from '@/lib/types';

type Props = {
  track: Track;
  index?: number;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onPress?: () => void;
  onFavorite?: () => void;
  onMore?: () => void;
  showAlbum?: boolean;
  showToolbar?: boolean;
};

export function TrackRow({
  track,
  index,
  isCurrent,
  isPlaying,
  onPress,
  onFavorite,
  onMore,
  showAlbum = false,
  showToolbar = true,
}: Props) {
  const styles = useAppStyles(createStyles);
  const initials = trackInitials(track.artist);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, isCurrent && styles.rowActive, pressed && { backgroundColor: colors.surfaceHigh }]}>
      {index !== undefined ? (
        <Text style={[typography.labelLg, styles.index, isCurrent && { color: colors.primary, fontFamily: fonts.bodySemi }]}>
          {isCurrent && isPlaying ? '' : index + 1}
        </Text>
      ) : null}

      <View style={styles.artWrap}>
        {isCurrent && isPlaying ? null : (
          <Artwork hue={track.hue} size={44} radiusValue={radius.sm} initials={initials} iconSize={18} />
        )}
        {isCurrent && isPlaying ? (
          <View style={[styles.playingArt, { width: 44, height: 44, borderRadius: radius.sm }]}>
            <Equalizer active size={16} bars={4} />
          </View>
        ) : null}
      </View>

      <View style={styles.meta}>
        <Text
          numberOfLines={1}
          style={[typography.bodyLg, styles.title, isCurrent && { color: colors.primary, fontFamily: fonts.bodySemi }]}>
          {track.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[typography.bodySm, styles.sub, { color: isCurrent ? colors.textSecondary : colors.onSurfaceVariant }]}>
          {showAlbum ? `${track.artist} • ${track.album}` : track.artist}
        </Text>
      </View>

      <View style={styles.right}>
        {isCurrent && isPlaying ? <Equalizer active size={16} bars={4} /> : null}
        {showToolbar ? (
          <>
            {onFavorite ? (
              <Pressable
                hitSlop={10}
                onPress={(e) => {
                  e.stopPropagation();
                  onFavorite();
                }}
                style={styles.iconBtn}>
                <MaterialIcons
                  name="favorite"
                  size={20}
                  color={track.favorite ? colors.favorite : colors.textMuted}
                  style={track.favorite ? { textShadowColor: colors.favorite, textShadowRadius: 6 } : undefined}
                />
              </Pressable>
            ) : null}
            {onMore ? (
              <Pressable
                hitSlop={10}
                onPress={(e) => {
                  e.stopPropagation();
                  onMore();
                }}
                style={styles.iconBtn}>
                <MaterialIcons name="more-vert" size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            ) : null}
          </>
        ) : null}
        <Text style={[typography.labelMd, styles.duration, { color: isCurrent ? colors.primary : colors.textMuted }]}>
          {formatTime(track.duration)}
        </Text>
      </View>
    </Pressable>
  );
}

const createStyles = () => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    gap: spacing.md,
  },
  rowActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  index: {
    width: 22,
    textAlign: 'center',
    color: colors.outline,
  },
  artWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  playingArt: {
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: colors.onSurface,
  },
  sub: {
    color: colors.onSurfaceVariant,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  duration: {
    fontVariant: ['tabular-nums'],
  },
});