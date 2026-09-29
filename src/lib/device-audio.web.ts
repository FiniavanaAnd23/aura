/**
 * Variante web du scan audio.
 * `expo-media-library` n'a pas d'implémentation web : l'importer casse le
 * rendu statique (SSG) de `expo export --platform web`. Le web sert
 * uniquement d'aperçu de l'interface, le scan y est donc un no-op.
 */
import {
  isMeaningfulAudio,
  MIN_SIZE_FALLBACK,
  PAGE,
  type ScanResult,
  type ScannedAudio,
} from '@/lib/device-audio.shared';

export type { ScanResult, ScannedAudio };
export { isMeaningfulAudio, MIN_SIZE_FALLBACK, PAGE };

export async function requestDeviceAudioPermission(): Promise<boolean> {
  return false;
}

export async function scanDeviceAudio(_onProgress?: (found: number) => void): Promise<ScannedAudio[]> {
  return [];
}

export async function persistScannedAudio(item: ScannedAudio): Promise<string> {
  return item.uri;
}
