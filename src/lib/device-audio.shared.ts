/**
 * Types et helpers purs du scan audio.
 * Isolé de `device-audio.ts` pour être importable par la variante web
 * (`device-audio.web.ts`) sans tirer `expo-media-library`, qui n'a pas
 * d'implémentation web (ses classes étendent des classes natives undefined
 * et font échouer le rendu statique de l'export web).
 */

export type ScannedAudio = {
  filename: string;
  uri: string;
  durationSec?: number;
  createdAt?: number;
};

export type ScanResult = {
  found: number;
  added: number;
  skipped: number;
};

export const PAGE = 150;
export const MIN_SIZE_FALLBACK = 10 * 1024;

/** Un fichier audio « jouable » dure au moins 5 s. */
export function isMeaningfulAudio(item: ScannedAudio): boolean {
  if (item.durationSec == null) return true;
  return item.durationSec >= 5;
}
