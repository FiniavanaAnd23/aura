import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, shadows } from '@/constants/theme';

type Props = {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  size?: number;
  color?: string;
  onPress?: () => void;
  variant?: 'plain' | 'glass' | 'primary' | 'ghost';
  disabled?: boolean;
  style?: object;
  hitSlop?: number;
};

export function IconButton({ name, size = 22, color, onPress, variant = 'ghost', disabled, style, hitSlop = 8 }: Props) {
  const isPrimary = variant === 'primary';
  const isGlass = variant === 'glass';
  const isPlain = variant === 'plain';
  const tintColor = isPrimary ? colors.onPrimary : color ?? (isPlain ? colors.onSurfaceVariant : colors.onSurface);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isGlass && styles.glass,
        isPrimary && styles.primary,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <MaterialIcons name={name} size={size} color={isPrimary ? colors.onPrimary : tintColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glass: {
    backgroundColor: 'rgba(40, 42, 50, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadows.glowPrimary,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
});