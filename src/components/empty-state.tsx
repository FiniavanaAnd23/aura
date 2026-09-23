import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing, typography } from '@/constants/theme';
import { useAppStyles } from '@/context/theme-context';

type Props = {
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  message?: string;
  children?: React.ReactNode;
};

export function EmptyState({ icon = 'library-music', title, message, children }: Props) {
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <MaterialIcons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[typography.headlineSm, styles.title]}>{title}</Text>
      {message ? <Text style={[typography.bodyMd, styles.message]}>{message}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(160, 120, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.headlineSemi,
    textAlign: 'center',
  },
  message: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
  },
  actions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
  },
});