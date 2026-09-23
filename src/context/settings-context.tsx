import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { KEYS, loadJSON, saveJSON } from '@/lib/storage';

export type EqPreset = 'flat' | 'rock' | 'pop' | 'classical' | 'jazz' | 'bassBoost' | 'vocal' | 'electronic' | 'custom';

export const EQ_PRESETS: { id: EqPreset; label: string; bands: number[] }[] = [
  { id: 'flat', label: 'Flat', bands: [0, 0, 0, 0, 0] },
  { id: 'rock', label: 'Rock', bands: [0.6, 0.3, -0.2, 0.2, 0.5] },
  { id: 'pop', label: 'Pop', bands: [-0.2, 0.3, 0.5, 0.2, -0.3] },
  { id: 'classical', label: 'Classical', bands: [0.4, 0.1, -0.3, -0.1, 0.4] },
  { id: 'jazz', label: 'Jazz', bands: [0.4, 0.2, -0.1, 0.1, 0.3] },
  { id: 'bassBoost', label: 'Bass Boost', bands: [0.9, 0.6, 0, 0, 0] },
  { id: 'vocal', label: 'Vocal', bands: [-0.2, 0.1, 0.6, 0.5, 0] },
  { id: 'electronic', label: 'Electronic', bands: [0.5, 0.2, -0.4, 0.4, 0.6] },
];

export const BAND_NAMES = ['Sub', 'Bass', 'Mid', 'Haut-mid', 'Aigu'];

export type AppSettings = {
  volume: number;
  eqPreset: EqPreset;
  bands: number[];
  bassBoost: number;
  virtualizer: boolean;
  balance: number;
  loudness: boolean;
  crossfade: boolean;
  fadeInOut: boolean;
  gapless: boolean;
};

const DEFAULTS: AppSettings = {
  volume: 0.85,
  eqPreset: 'flat',
  bands: [0, 0, 0, 0, 0],
  bassBoost: 0,
  virtualizer: false,
  balance: 0,
  loudness: true,
  crossfade: false,
  fadeInOut: true,
  gapless: true,
};

type SettingsContextValue = AppSettings & {
  update: (patch: Partial<AppSettings>) => void;
  selectPreset: (id: EqPreset) => void;
  resetEqualizer: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      const loaded = await loadJSON<AppSettings>(KEYS.settings, DEFAULTS);
      setSettings({
        ...DEFAULTS,
        ...loaded,
        bands: Array.isArray(loaded.bands) && loaded.bands.length === 5 ? loaded.bands : DEFAULTS.bands,
      });
      hydrated.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => {
      saveJSON(KEYS.settings, settings);
    }, 200);
    return () => clearTimeout(t);
  }, [settings]);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectPreset = useCallback((id: EqPreset) => {
    setSettings((prev) => {
      const found = EQ_PRESETS.find((p) => p.id === id);
      return found
        ? { ...prev, eqPreset: id, bands: [...found.bands], bassBoost: id === 'bassBoost' ? Math.max(prev.bassBoost, 0.5) : prev.bassBoost }
        : prev;
    });
  }, []);

  const resetEqualizer = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      eqPreset: 'flat',
      bands: [0, 0, 0, 0, 0],
      bassBoost: 0,
      virtualizer: false,
      balance: 0,
    }));
  }, []);

  // Le thème est piloté depuis son contexte dédié
  const value = useMemo<SettingsContextValue>(
    () => ({ ...settings, update, selectPreset, resetEqualizer }),
    [settings, update, selectPreset, resetEqualizer]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings doit être utilisé dans <SettingsProvider>');
  return ctx;
}