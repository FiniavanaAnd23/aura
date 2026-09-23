import React, { useCallback, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAppStyles } from '@/context/theme-context';
import { clamp01 } from '@/lib/utils';

type Props = {
  progress: number;
  duration: number;
  onSeek: (seconds: number) => void;
  trackHeight?: number;
  disabled?: boolean;
};

export function SeekBar({ progress, duration, onSeek, trackHeight = 4, disabled }: Props) {
  const styles = useAppStyles(createStyles);
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const ratio = dragging && dragRatio !== null ? dragRatio : clamp01(progress);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const ratioFromEvent = useCallback(
    (e: GestureResponderEvent) => {
      const r = e.nativeEvent.locationX / (width || 1);
      return clamp01(r);
    },
    [width]
  );

  const release = useCallback(
    (r: number) => {
      setDragging(false);
      setDragRatio(null);
      if (duration > 0) {
        onSeek(r * duration);
      }
    },
    [duration, onSeek]
  );

  return (
    <View style={{ height: Math.max(28, trackHeight + 22), justifyContent: 'center', width: '100%' }}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => !disabled}
        onMoveShouldSetResponder={() => !disabled && !dragging}
        onResponderGrant={() => setDragging(true)}
        onResponderMove={(e) => {
          if (dragging) setDragRatio(ratioFromEvent(e));
        }}
        onResponderRelease={(e) => release(ratioFromEvent(e))}
        onResponderTerminate={(e) => release(ratioFromEvent(e))}
      />
      <View style={[styles.track, { height: trackHeight, borderRadius: trackHeight / 2 }]}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
        {ratio > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                left: `${Math.round(ratio * 100)}%`,
                transform: [{ translateX: -7 }, { scale: dragging ? 1.2 : 1 }],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.electricViolet,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});