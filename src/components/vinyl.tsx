import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Artwork } from '@/components/artwork';
import { colors } from '@/constants/theme';
import { useAppStyles } from '@/context/theme-context';

const SPIN_DURATION = 14000;
const BAR_COUNT = 32;
const BAR_MAX = 26;
const BAR_WIDTH = 3;

type RingProps = {
  playing: boolean;
  size: number;
  /** 0 → presque plat, 1 → pleine amplitude. */
  energy?: number;
  color?: string;
};

/**
 * Anneau de barres animées entourant la pochette.
 * Toutes les animations passent par `transform`/`opacity` afin de rester
 * sur le driver natif.
 */
export function RingVisualizer({ playing, size, energy = 1, color = colors.primary }: RingProps) {
  const styles = useAppStyles(createStyles);
  const [values] = useState(() => Array.from({ length: BAR_COUNT }, () => new Animated.Value(0)));

  useEffect(() => {
    if (!playing || energy <= 0) {
      values.forEach((v) => v.stopAnimation());
      return;
    }
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((i * 37) % 260),
          Animated.timing(v, {
            toValue: energy,
            duration: 220 + (i % 5) * 90,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.12,
            duration: 260 + (i % 4) * 70,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [playing, energy, values]);

  const ringRadius = size / 2 + 16;

  return (
    <View pointerEvents="none" style={styles.ring} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {values.map((v, i) => {
        const angle = (i / BAR_COUNT) * 360;
        return (
          <View
            key={i}
            style={[
              styles.slot,
              { height: BAR_MAX, transform: [{ rotate: `${angle}deg` }, { translateY: -ringRadius }] },
            ]}>
            <Animated.View
              style={[
                styles.bar,
                {
                  backgroundColor: i % 3 === 0 ? colors.secondary : color,
                  opacity: playing ? 0.9 : 0.25,
                  transform: [
                    {
                      scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1] }),
                    },
                  ],
                },
              ]}
            />
          </View>
        );
      })}
      <View style={[styles.center, { width: size, height: size }]} />
    </View>
  );
}

type VinylProps = {
  playing: boolean;
  hue: number;
  initials: string;
  size: number;
};

/** Pochette présentée comme un disque qui tourne pendant la lecture. */
export function VinylArtwork({ playing, hue, initials, size }: VinylProps) {
  const styles = useAppStyles(createStyles);
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!playing) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_DURATION,
        easing: Easing.linear,
        isInteraction: false,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [playing, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
        <Artwork
          hue={hue}
          initials={initials}
          size={size}
          radiusValue={size / 2}
          iconSize={Math.round(size * 0.28)}
        />
        {/* Sillons du disque */}
        <View pointerEvents="none" style={styles.grooves}>
          {[0.72, 0.54, 0.36].map((ratio) => (
            <View
              key={ratio}
              style={[
                styles.groove,
                {
                  width: size * ratio,
                  height: size * ratio,
                  borderRadius: (size * ratio) / 2,
                },
              ]}
            />
          ))}
        </View>
        {/* Trou central */}
        <View
          pointerEvents="none"
          style={[
            styles.hole,
            { width: size * 0.14, height: size * 0.14, borderRadius: (size * 0.14) / 2 },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    ring: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slot: {
      position: 'absolute',
      width: BAR_WIDTH,
      alignItems: 'center',
    },
    bar: {
      width: BAR_WIDTH,
      height: BAR_MAX,
      borderRadius: BAR_WIDTH / 2,
    },
    center: {
      position: 'absolute',
    },
    grooves: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groove: {
      position: 'absolute',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.28)',
    },
    hole: {
      position: 'absolute',
      backgroundColor: 'rgba(12,12,18,0.9)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
    },
  });
