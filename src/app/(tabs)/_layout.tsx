import { Tabs } from 'expo-router/js-tabs';
import React from 'react';

import { FloatingTabBar } from '@/components/tab-bar';
import { colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';

export default function TabsLayout() {
  useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}