import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import { colors } from '@/constants/theme';
import { LibraryProvider } from '@/context/library-context';
import { PlayerProvider } from '@/context/player-context';
import { SettingsProvider } from '@/context/settings-context';
import { restoreTheme, ThemeProvider, useTheme } from '@/context/theme-context';

SplashScreen.preventAutoHideAsync();

function Root() {
  const theme = useTheme();

  useEffect(() => {
    (async () => {
      const restored = await restoreTheme();
      theme.setMode(restored);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <SettingsProvider>
        <LibraryProvider>
          <PlayerProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="player"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="playlist/[id]" />
              <Stack.Screen name="settings" />
            </Stack>
          </PlayerProvider>
        </LibraryProvider>
      </SettingsProvider>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}