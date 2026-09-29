let counter = 0;

export function genId(prefix = 'id') {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function formatTime(totalSeconds?: number) {
  if (totalSeconds === undefined || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '--:--';
  }
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return '0 Ko';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1).replace('.', ',')} Go`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bonjour';
  if (h >= 12 && h < 18) return 'Bon après-midi';
  if (h >= 18 && h < 23) return 'Bonsoir';
  return 'Bonne nuit';
}

export function titleCount(n: number) {
  return `${n} ${n > 1 ? 'titres' : 'titre'}`;
}

export function trackInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '♪';
}

/**
 * Initiales affichées sur la pochette d'un morceau.
 * Le titre prime sur l'artiste : beaucoup de fichiers importés n'ont pas de
 * tag d'artiste (« Artiste inconnu »), ce qui affichait « AI » sur les pochettes.
 */
export function artworkInitials(track: { title?: string; artist?: string; album?: string }) {
  const source = track.title?.trim() || track.artist?.trim() || track.album?.trim() || '';
  return trackInitials(source);
}

export type ParsedTrackName = { title: string; artist: string; album?: string };

/**
 * Décompose un nom de fichier en artiste / album / titre.
 * Gère les conventions courantes des collections hors-ligne :
 * `01 - Artiste - Titre.mp3`, `Artiste - Album - 01 Titre.mp3`, `Artiste _ Titre.mp3`.
 */
export function parseTrackName(fileName: string): ParsedTrackName {
  let basename = fileName.replace(/\.[^.]+$/, '').trim();
  basename = basename.replace(/\s*\(\d+\)\s*$/, '').trim();
  basename = basename.replace(/^\d{1,3}[\s._-]+/, '').trim();
  const separators = [' - ', ' – ', ' — ', '_', '-'];
  for (const sep of separators) {
    const parts = basename.split(sep).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      // On saute un éventuel numéro de piste en tête de dernier segment
      const last = parts[parts.length - 1].replace(/^\d{1,3}[\s._-]+/, '').trim();
      const artist = parts[0];
      const album = parts[1];
      if (artist && album && last && !/^\d+$/.test(artist)) {
        return { artist, album, title: last };
      }
    }
    if (parts.length === 2) {
      const [artist, title] = parts;
      if (artist && title && !/^\d+$/.test(artist)) return { artist, title };
    }
  }
  return { artist: 'Artiste inconnu', title: basename || 'Sans titre' };
}

export function sanitizeFileName(name: string) {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'audio';
}

export function hashHue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function derivedAlbum(track: { artist?: string; genre?: string }) {
  return track.genre ? `${track.genre}` : 'Hors-ligne';
}

export function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

export type TrackSortKey = 'titre' | 'artiste' | 'album' | 'duree' | 'date';

export const TRACK_SORTS: { key: TrackSortKey; label: string }[] = [
  { key: 'titre', label: 'Titre' },
  { key: 'artiste', label: 'Artiste' },
  { key: 'album', label: 'Album' },
  { key: 'duree', label: 'Durée' },
  { key: 'date', label: 'Ajout' },
];

/** Tri « naturel » insensible aux accents et aux nombres (2 < 10). */
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

export function sortTracks<T extends { title: string; artist: string; album: string; duration?: number; addedAt: number }>(
  tracks: T[],
  key: TrackSortKey
): T[] {
  const out = [...tracks];
  out.sort((a, b) => {
    switch (key) {
      case 'artiste':
        return collator.compare(a.artist, b.artist) || collator.compare(a.title, b.title);
      case 'album':
        return collator.compare(a.album, b.album) || collator.compare(a.title, b.title);
      case 'duree':
        return (a.duration ?? 0) - (b.duration ?? 0);
      case 'date':
        return b.addedAt - a.addedAt;
      case 'titre':
      default:
        return collator.compare(a.title, b.title);
    }
  });
  return out;
}

/** Nom de genre retenu pour un morceau, avec repli lisible. */
export function genreName(track: { genre?: string }) {
  return track.genre?.trim() || 'Sans genre';
}

export function hslToHex(h: number, sPercent: number, lPercent: number) {
  const s = sPercent / 100;
  const l = lPercent / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}