import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { colors, getThemeMode, setThemePalette, type ThemeMode } from '@/constants/theme';
import { KEYS, loadRawJSON, saveJSON } from '@/lib/storage';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getThemeMode());

  const setMode = useCallback((next: ThemeMode) => {
    setThemePalette(next);
    setModeState(next);
    saveJSON(KEYS.theme, next);
  }, []);

  const toggle = useCallback(() => {
    setMode(getThemeMode() === 'light' ? 'dark' : 'light');
  }, [setMode]);

  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>');
  return ctx;
}

export async function restoreTheme() {
  const mode = await loadRawJSON<ThemeMode | null>(KEYS.theme, null);
  setThemePalette(mode === 'light' ? 'light' : 'dark');
  return getThemeMode();
}

/**
 * Recalcule les styles à chaque changement de thème.
 * Les factories doivent lire `colors.*` au moment de l'exécution.
 */
export function useAppStyles<T>(factory: () => T): T {
  const { mode } = useTheme();
  return useMemo(() => {
    return factory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
}

export { colors };