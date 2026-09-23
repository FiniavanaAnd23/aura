import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing, typography } from '@/constants/theme';
import { useAppStyles } from '@/context/theme-context';

type Props = {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
  leadingIcon?: React.ReactNode;
  right?: React.ReactNode;
};

export function SectionHeader({ title, eyebrow, actionLabel, onAction, leadingIcon, right }: Props) {
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {leadingIcon}
        <View style={styles.titles}>
          {eyebrow ? (
            <Text style={[typography.labelSm, styles.eyebrow, { letterSpacing: 1.2 }]}>{eyebrow}</Text>
          ) : null}
          <View style={styles.titleRow}>
            <Text style={[typography.headlineSm, styles.title]}>{title}</Text>
          </View>
        </View>
      </View>
      {right ?? null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[typography.labelMd, styles.action]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titles: {
    gap: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.headlineSemi,
  },
  eyebrow: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  action: {
    color: colors.primary,
    fontFamily: fonts.bodySemi,
  },
});