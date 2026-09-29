import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  isMeaningfulAudio,
  MIN_SIZE_FALLBACK,
  PAGE,
  type ScanResult,
  type ScannedAudio,
} from '@/lib/device-audio.shared';

export type { ScanResult, ScannedAudio };
export { isMeaningfulAudio, MIN_SIZE_FALLBACK, PAGE };

/**
 * `expo-media-library` expose deux API :
 *  - la nouvelle (racine du package), adossée au module natif
 *    `ExpoMediaLibraryNext`, qui n'existe que dans un development build ;
 *  - l'ancienne (`expo-media-library/legacy`), présente dans Expo Go.
 *
 * Les deux sont chargées à la demande et sous `try/catch` : un module natif
 * manquant levait une erreur dès l'évaluation du module, ce qui faisait
 * échouer le chargement de *toutes* les routes de l'application.
 */
declare function require(name: string): unknown;

type NextModule = typeof import('expo-media-library');
type LegacyModule = typeof import('expo-media-library/legacy');

let nextCache: NextModule | null | undefined;
let legacyCache: LegacyModule | null | undefined;

function loadNext(): NextModule | null {
  if (nextCache === undefined) {
    try {
      nextCache = require('expo-media-library') as NextModule;
    } catch {
      nextCache = null;
    }
  }
  return nextCache;
}

function loadLegacy(): LegacyModule | null {
  if (legacyCache === undefined) {
    try {
      legacyCache = require('expo-media-library/legacy') as LegacyModule;
    } catch {
      legacyCache = null;
    }
  }
  return legacyCache;
}

/** `true` si l'une des deux API est utilisable sur cette plateforme. */
export function isDeviceScanAvailable() {
  if (Platform.OS === 'web') return false;
  return Boolean(loadNext() ?? loadLegacy());
}

export async function requestDeviceAudioPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const next = loadNext();
  try {
    if (next) {
      const granular = Platform.OS === 'android' ? (['audio'] as Parameters<NextModule['requestPermissionsAsync']>[1]) : undefined;
      const perm = await next.requestPermissionsAsync(false, granular);
      return perm.granted;
    }
    const legacy = loadLegacy();
    if (!legacy) return false;
    const granular = Platform.OS === 'android' ? (['audio'] as Parameters<LegacyModule['requestPermissionsAsync']>[1]) : undefined;
    const perm = await legacy.requestPermissionsAsync(false, granular);
    return perm.granted;
  } catch {
    return false;
  }
}

async function scanWithNext(next: NextModule): Promise<ScannedAudio[]> {
  const out: ScannedAudio[] = [];
  let offset = 0;
  for (;;) {
    const assets = await new next.Query()
      .eq(next.AssetField.MEDIA_TYPE, next.MediaType.AUDIO)
      .orderBy(next.AssetField.CREATION_TIME)
      .offset(offset)
      .limit(PAGE)
      .exe();
    for (const asset of assets) {
      try {
        const [filename, duration, uri, created] = await Promise.all([
          asset.getFilename(),
          asset.getDuration(),
          asset.getUri(),
          asset.getCreationTime().catch(() => null),
        ]);
        if (!uri) continue;
        out.push({
          filename,
          uri,
          durationSec: duration != null && duration > 0 ? duration / 1000 : undefined,
          createdAt: created ?? undefined,
        });
      } catch {
        // un asset illisible n'interrompt pas le scan
      }
    }
    if (assets.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function scanWithLegacy(legacy: LegacyModule): Promise<ScannedAudio[]> {
  const out: ScannedAudio[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await legacy.getAssetsAsync({
      mediaType: 'audio',
      first: PAGE,
      after: cursor,
      sortBy: [['creationTime', true]],
    });
    for (const asset of page.assets) {
      if (!asset.uri) continue;
      out.push({
        filename: asset.filename,
        uri: asset.uri,
        durationSec: asset.duration > 0 ? asset.duration : undefined,
        createdAt: asset.creationTime || undefined,
      });
    }
    if (!page.endCursor || page.assets.length < PAGE) break;
    cursor = page.endCursor;
  }
  return out;
}

export async function scanDeviceAudio(onProgress?: (found: number) => void): Promise<ScannedAudio[]> {
  if (Platform.OS === 'web') return [];
  const next = loadNext();
  try {
    const out = next ? await scanWithNext(next) : [];
    if (out.length) {
      onProgress?.(out.length);
      return out;
    }
  } catch {
    // On bascule sur l'API legacy
  }
  const legacy = loadLegacy();
  if (!legacy) return [];
  const out = await scanWithLegacy(legacy);
  onProgress?.(out.length);
  return out;
}

export async function persistScannedAudio(item: ScannedAudio): Promise<string> {
  const rawName = item.filename || 'audio';
  if (Platform.OS === 'web') return item.uri;
  try {
    const musicDir = new Directory(Paths.document, 'music');
    if (!musicDir.exists) {
      musicDir.create({ idempotent: true, intermediates: true });
    }
    const dot = rawName.lastIndexOf('.');
    const stem = dot > 0 ? rawName.slice(0, dot) : rawName;
    const ext = dot > 0 ? rawName.slice(dot) : '';
    let dest = new File(musicDir, `${stem}${ext}`);
    let n = 2;
    while (dest.exists) {
      dest = new File(musicDir, `${stem} (${n})${ext}`);
      n += 1;
    }
    const source = new File(item.uri);
    source.copySync(dest);
    return dest.uri;
  } catch {
    // La copie a échoué : on garde l'URI d'origine (content:// streamable par ExoPlayer)
    return item.uri;
  }
}
