import type { SmartCollection, Track } from './types';

const normal = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function trackHaystack(track: Track) {
  return normal(`${track.title} ${track.artist} ${track.album} ${track.genre ?? ''}`);
}

export function searchTracks(tracks: Track[], query: string): Track[] {
  const q = normal(query.trim());
  if (!q) return tracks;
  const terms = q.split(/\s+/).filter(Boolean);
  return tracks.filter((t) => {
    const hay = trackHaystack(t);
    return terms.every((term) => hay.includes(term));
  });
}

export type QuickPlay = SmartCollection & { tracks: Track[] };

export function quickPlays(tracks: Track[]): QuickPlay[] {
  const favorites = tracks.filter((t) => t.favorite).sort((a, b) => b.addedAt - a.addedAt);
  const recent = [...tracks]
    .filter((t) => t.playCount > 0)
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 60);
  const newest = [...tracks].sort((a, b) => b.addedAt - a.addedAt).slice(0, 40);
  const top = [...tracks].sort((a, b) => b.playCount - a.playCount).slice(0, 40);

  const results: QuickPlay[] = [];
  if (recent.length) {
    results.push({ id: 'qp_recent', title: 'Écoutes récentes', subtitle: 'Revenez sur vos morceaux', hue: 265, tracks: recent });
  }
  if (favorites.length) {
    results.push({ id: 'qp_favs', title: 'Coups de cœur', subtitle: `${favorites.length} titres aimés`, hue: 315, tracks: favorites });
  }
  if (top.length) {
    results.push({ id: 'qp_top', title: 'Le plus écouté', subtitle: 'Vos classiques', hue: 20, tracks: top });
  }
  if (newest.length) {
    results.push({ id: 'qp_new', title: 'Ajouts récents', subtitle: 'Les derniers importés', hue: 190, tracks: newest });
  }
  return results;
}

export function artistSummary(tracks: Track[], limit = 12): { artist: string; tracks: Track[] }[] {
  const map = new Map<string, Track[]>();
  for (const t of tracks) {
    const list = map.get(t.artist) ?? [];
    list.push(t);
    map.set(t.artist, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limit)
    .map(([artist, list]) => ({ artist, tracks: list }));
}

export function albumSummary(tracks: Track[], limit = 12): { album: string; artist: string; tracks: Track[]; hue: number; addedAt: number }[] {
  const map = new Map<string, Track[]>();
  for (const t of tracks) {
    const key = `${t.album}\u0000${t.artist}`;
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[1][0].addedAt - a[1][0].addedAt)
    .slice(0, limit)
    .map(([key, list]) => {
      const [album, artist] = key.split('\u0000');
      return { album, artist, tracks: list, hue: list[0].hue, addedAt: list[0].addedAt };
    });
}

export function recentlyPlayed(tracks: Track[], recentIds: string[], limit = 20): Track[] {
  const map = new Map(tracks.map((t) => [t.id, t]));
  return recentIds.map((id) => map.get(id)).filter((t): t is Track => Boolean(t)).slice(0, limit);
}