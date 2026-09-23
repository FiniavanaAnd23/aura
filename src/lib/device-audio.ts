import * as MediaLibrary from 'expo-media-library';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

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

const PAGE = 150;
const MIN_SIZE_FALLBACK = 10 * 1024;

export async function requestDeviceAudioPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const granular = Platform.OS === 'android' ? ['audio'] as MediaLibrary.GranularPermission[] : undefined;
  const perm = await MediaLibrary.requestPermissionsAsync(false, granular);
  return perm.granted;
}

export async function scanDeviceAudio(onProgress?: (found: number) => void): Promise<ScannedAudio[]> {
  if (Platform.OS === 'web') return [];
  const out: ScannedAudio[] = [];
  let offset = 0;
  for (;;) {
    const assets = await new MediaLibrary.Query()
      .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.AUDIO)
      .orderBy(MediaLibrary.AssetField.CREATION_TIME)
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
    onProgress?.(out.length);
    if (assets.length < PAGE) break;
    offset += PAGE;
  }
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

export function isMeaningfulAudio(item: ScannedAudio): boolean {
  if (item.durationSec == null) return true;
  return item.durationSec >= 5;
}

export { MIN_SIZE_FALLBACK };