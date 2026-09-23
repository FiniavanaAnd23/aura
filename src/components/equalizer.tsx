import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

type Props = {
  active?: boolean;
  size?: number;
  color?: string;
  bars?: number;
};

const BAR_HEIGHTS = [0.45, 1, 0.65, 0.8, 0.5];

export function Equalizer({ active = true, size = 16, color = colors.primary, bars = 4 }: Props) {
  const [anims] = useState(() => BAR_HEIGHTS.slice(0, bars).map(() => new Animated.Value(0.6)));

  useEffect(() => {
    const loops = anims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 280 + i * 90,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(v, {
            toValue: 0.35,
            duration: 260 + i * 70,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      )
    );
    if (active) {
      loops.forEach((l) => l.start());
    }
    return () => {
      loops.forEach((l) => l.stop());
    };
  }, [active, anims]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: size, gap: 2 }}>
      {anims.map((v, i) => {
        const targetHeight = (BAR_HEIGHTS[i] ?? 0.6) * size;
        return (
          <Animated.View
            key={i}
            style={{
              width: 3,
              borderRadius: 2,
              backgroundColor: i % 2 === 0 ? color : colors.secondary,
              height: v.interpolate({
                inputRange: [0.35, 1],
                outputRange: [Math.max(3, targetHeight * 0.35), targetHeight],
              }),
              opacity: active ? 1 : 0.35,
            }}
          />
        );
      })}
    </View>
  );
}

export function StaticBars({ size = 14, color = colors.primary, bars = 1 }: { size?: number; color?: string; bars?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: size, gap: 2 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: size * (i % 2 === 0 ? 0.7 : 1),
            borderRadius: 2,
            backgroundColor: i % 2 === 0 ? color : colors.secondary,
            opacity: 0.8,
          }}
        />
      ))}
    </View>
  );
}

export const equalizerStyles = StyleSheet.create({});