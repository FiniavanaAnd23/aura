import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius, shadows, typography } from '@/constants/theme';
import { useAppStyles } from '@/context/theme-context';

type Props = {
  label: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: object;
};

export function PrimaryButton({ label, icon, onPress, loading, disabled, small, style }: Props) {
  const styles = useAppStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [pressed && styles.pressed, small && styles.smallWrap, style]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, small && styles.small, (disabled || loading) && styles.disabled]}>
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} size="small" />
        ) : (
          <>
            {icon ? <MaterialIcons name={icon} size={small ? 16 : 18} color={colors.onPrimary} /> : null}
            <Text style={[typography.labelLg, styles.label, small && { fontSize: 13 }]}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const createStyles = () => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: radius.lg,
    ...shadows.glowPrimary,
  },
  small: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  smallWrap: {
    alignSelf: 'flex-start',
  },
  label: {
    color: colors.onPrimary,
    fontFamily: fonts.bodySemi,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});