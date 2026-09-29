import React, { useCallback, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAppStyles } from '@/context/theme-context';

type Props = {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  disabled?: boolean;
  style?: object;
  trackHeight?: number;
};

function quantize(raw: number, min: number, max: number, step?: number) {
  if (!step) return Math.min(max, Math.max(min, raw));
  const snapped = Math.round((raw - min) / step) * step + min;
  const clamped = Math.min(max, Math.max(min, snapped));
  // Évite les artefacts de virgule flottante (0.30000000000000004)
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(clamped.toFixed(decimals));
}

/**
 * Curseur multiplateforme construit sur le même principe que SeekBar.
 * Remplace @react-native-community/slider, dont le composant natif
 * n'est pas rendu par react-native-web (casse l'export web).
 */
export function Slider({
  value,
  minimumValue = 0,
  maximumValue = 1,
  step,
  onValueChange,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  disabled,
  style,
  trackHeight = 4,
}: Props) {
  const styles = useAppStyles(createStyles);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const span = maximumValue - minimumValue || 1;
  const ratio = dragging && dragRatio !== null ? dragRatio : (value - minimumValue) / span;
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const ratioFromEvent = useCallback(
    (e: GestureResponderEvent) => {
      const r = e.nativeEvent.locationX / (width || 1);
      return Math.min(1, Math.max(0, r));
    },
    [width]
  );

  const emit = useCallback(
    (r: number) => {
      onValueChange(quantize(minimumValue + r * span, minimumValue, maximumValue, step));
    },
    [minimumValue, maximumValue, span, step, onValueChange]
  );

  return (
    <View style={[{ height: 32, justifyContent: 'center' }, style]}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => !disabled}
        onMoveShouldSetResponder={() => !disabled && !dragging}
        onResponderGrant={(e) => {
          const r = ratioFromEvent(e);
          setDragging(true);
          setDragRatio(r);
          emit(r);
        }}
        onResponderMove={(e) => {
          if (dragging) {
            const r = ratioFromEvent(e);
            setDragRatio(r);
            emit(r);
          }
        }}
        onResponderRelease={() => {
          setDragging(false);
          setDragRatio(null);
        }}
        onResponderTerminate={() => {
          setDragging(false);
          setDragRatio(null);
        }}
      />
      <View
        style={[
          styles.track,
          {
            height: trackHeight,
            borderRadius: trackHeight / 2,
            backgroundColor: maximumTrackTintColor ?? colors.stroke,
          },
        ]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: minimumTrackTintColor ?? colors.primary,
            },
          ]}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            left: `${pct}%`,
            backgroundColor: thumbTintColor ?? colors.surfaceHigh,
            transform: [{ translateX: -9 }, { scale: dragging ? 1.2 : 1 }],
          },
        ]}
      />
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    track: {
      width: '100%',
      overflow: 'visible',
    },
    fill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 99,
    },
    thumb: {
      position: 'absolute',
      top: -7,
      width: 18,
      height: 18,
      borderRadius: 9,
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
    },
  });
