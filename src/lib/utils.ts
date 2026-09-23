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

export function parseTrackName(fileName: string): { title: string; artist: string } {
  let basename = fileName.replace(/\.[^.]+$/, '').trim();
  basename = basename.replace(/\s*\(\d+\)\s*$/, '').trim();
  basename = basename.replace(/^\d{1,3}[\s._-]+/, '').trim();
  const separators = [' - ', ' – ', ' — ', '_', '-'];
  for (const sep of separators) {
    const idx = basename.indexOf(sep);
    if (idx > 0 && idx < basename.length - sep.length) {
      const artist = basename.slice(0, idx).trim();
      const title = basename.slice(idx + sep.length).trim();
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