import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';
import { useAppStyles } from '@/context/theme-context';

const GRADIENTS: readonly [string, string][] = [
  ['#8B5CF6', '#C084FC'],
  ['#7C3AED', '#4CD7F6'],
  ['#EC4899', '#F59E0B'],
  ['#3B82F6', '#10B981'],
  ['#A078FF', '#F751A1'],
  ['#06B6D4', '#6366F1'],
  ['#F43F5E', '#8B5CF6'],
  ['#0EA5E9', '#EC4899'],
];

function pickGradient(hue: number): [string, string] {
  const idx = ((hue | 0) % GRADIENTS.length + GRADIENTS.length) % GRADIENTS.length;
  return GRADIENTS[idx];
}

type Props = {
  hue: number;
  size: number;
  radiusValue?: number;
  initials?: string;
  iconSize?: number;
  dimmed?: boolean;
  style?: object;
};

export function Artwork({ hue, size, radiusValue = radius.md, initials, iconSize = size * 0.38, style }: Props) {
  const styles = useAppStyles(createStyles);
  const [from, to] = pickGradient(hue);
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radiusValue }, style]}>
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0.1, y: 0.05 }}
        end={{ x: 0.95, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.gradient]}>
        <View style={styles.overlay}>
          <View style={[styles.halo, { backgroundColor: to, opacity: 0.4 }]} />
        </View>
        {initials ? (
          <View style={styles.initialsRow}>
            <Text
              style={{
                color: '#FFFFFF',
                fontFamily: fonts.headline,
                fontSize: size * 0.3,
                textShadowColor: 'rgba(0,0,0,0.35)',
                textShadowRadius: 4,
              }}>
              {initials}
            </Text>
          </View>
        ) : (
          <View style={styles.initialsRow}>
            <MaterialIcons name="graphic-eq" size={iconSize} color="rgba(255,255,255,0.92)" />
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceHighest,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    width: '140%',
    height: '140%',
    borderRadius: 999,
    top: '-30%',
    left: '-20%',
  },
  initialsRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});