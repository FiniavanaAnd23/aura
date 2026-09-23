import React, { useEffect, useState } from 'react';
import { Animated, Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type FadeUpProps = {
  children?: React.ReactNode;
  index?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function FadeUp({ children, index = 0, duration = 320, style }: FadeUpProps) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: Math.min(index, 8) * 70,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, duration, index]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
            },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

type PressableScaleProps = PressableProps & {
  children?: React.ReactNode;
  scaleTo?: number;
};

export function PressableScale({ children, onPress, onPressIn, onPressOut, scaleTo = 0.965, ...rest }: PressableScaleProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const pressIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 60, bounciness: 6 }).start();
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 6 }).start();
    onPressOut?.(e);
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} {...rest}>
        {children}
      </Pressable>
    </Animated.View>
  );
}