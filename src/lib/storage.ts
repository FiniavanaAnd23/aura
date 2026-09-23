import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  library: 'aura:library:v1',
  queue: 'aura:queue:v1',
  playerPrefs: 'aura:playerPrefs:v1',
  recentSearches: 'aura:recentSearches:v1',
  recentTracks: 'aura:recentTracks:v1',
  lastPlayed: 'aura:lastPlayed:v1',
  settings: 'aura:settings:v1',
  theme: 'aura:theme:v1',
} as const;

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

export async function loadRawJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible : on ignore silencieusement
  }
}

export async function removeKey(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export { KEYS };

export const STORE_PREFIX = 'aura_vibe';