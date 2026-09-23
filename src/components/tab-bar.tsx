import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/mini-player';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { usePlayer } from '@/context/player-context';
import { useAppStyles, useTheme } from '@/context/theme-context';

const TABS: {
  name: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  activeIcon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
}[] = [
  { name: 'index', icon: 'home', activeIcon: 'home', label: 'Accueil' },
  { name: 'explore', icon: 'search', activeIcon: 'search', label: 'Explorer' },
  { name: 'library', icon: 'library-music', activeIcon: 'library-music', label: 'Bibliothèque' },
];

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const styles = useAppStyles(createStyles);
  const { mode } = useTheme();
  const player = usePlayer();
  const hasTrack = Boolean(player.currentTrack);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      {hasTrack ? (
        <View pointerEvents="auto">
          <MiniPlayer bottom={70 + insets.bottom} />
        </View>
      ) : null}

      <View pointerEvents="auto">
        <BlurView intensity={mode === 'light' ? 70 : 56} tint={mode === 'light' ? 'light' : 'dark'} style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const options = descriptors[route.key]?.options;
            const label = (options?.title ?? TABS.find((t) => t.name === route.name)?.label ?? route.name) as string;
            const icon = TABS.find((t) => t.name === route.name)?.icon ?? 'circle';

            return (
              <Pressable
                key={route.key}
                style={styles.tab}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}>
                <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                  <MaterialIcons
                    name={icon}
                    size={25}
                    color={focused ? colors.primary : colors.onSurfaceVariant}
                  />
                </View>
                <Text style={[typography.labelSm, styles.label, focused && { color: colors.primary, fontFamily: fonts.bodySemi }]}>
                  {label}
                </Text>
                <View style={[styles.dot, focused && styles.dotActive]} />
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
    gap: spacing.xs,
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    minWidth: 48,
    borderRadius: 999,
  },
  iconWrapActive: {
    backgroundColor: colors.strokeActive,
  },
  label: {
    color: colors.onSurfaceVariant,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 2,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
});