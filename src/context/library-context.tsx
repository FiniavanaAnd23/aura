import { createAudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { isMeaningfulAudio, persistScannedAudio, requestDeviceAudioPermission, scanDeviceAudio } from '@/lib/device-audio';
import { derivedAlbum, genId, hashHue, parseTrackName, sanitizeFileName } from '@/lib/utils';
import { KEYS, loadJSON, loadRawJSON, saveJSON } from '@/lib/storage';
import type { LibraryData, Playlist, Track } from '@/lib/types';

export type DeviceImportResult = {
  denied: boolean;
  found: number;
  added: number;
};

const EMPTY_LIBRARY: LibraryData = { tracks: [], playlists: [] };

function readAudioDuration(uri: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    let cleanup: ReturnType<typeof setTimeout> | undefined;
    let sub: { remove: () => void } | undefined;
    const player = createAudioPlayer({ uri }, { updateInterval: 500 });
    try {
      player.muted = true;
    } catch {
      // ignore
    }

    const finish = (duration?: number) => {
      if (settled) return;
      settled = true;
      if (cleanup) clearTimeout(cleanup);
      try {
        sub?.remove();
      } catch {
        // ignore
      }
      try {
        player.pause();
      } catch {
        // ignore
      }
      try {
        player.remove();
      } catch {
        // ignore
      }
      resolve(duration);
    };

    sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded && status.duration > 0) {
        finish(status.duration);
        return;
      }
      if (!settled && status.currentTime >= 1) {
        try {
          player.pause();
        } catch {
          // ignore
        }
      }
    });

    cleanup = setTimeout(() => {
      finish(undefined);
    }, 5000);

    try {
      player.play();
    } catch {
      // ignore
    }
  });
}

function uniqueDest(musicDir: Directory, baseName: string): File {
  const dot = baseName.lastIndexOf('.');
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot > 0 ? baseName.slice(dot) : '';
  let candidate = new File(musicDir, `${stem}${ext}`);
  let n = 2;
  while (candidate.exists) {
    candidate = new File(musicDir, `${stem} (${n})${ext}`);
    n += 1;
  }
  return candidate;
}

async function persistPickedAudio(asset: DocumentPicker.DocumentPickerAsset): Promise<string | undefined> {
  const rawName = asset.name ? sanitizeFileName(asset.name) : 'audio';
  if (Platform.OS === 'web') {
    return asset.uri;
  }
  try {
    const musicDir = new Directory(Paths.document, 'music');
    if (!musicDir.exists) {
      musicDir.create({ idempotent: true, intermediates: true });
    }
    const dest = uniqueDest(musicDir, rawName);
    const source = new File(asset.uri);
    source.moveSync(dest);
    return dest.uri;
  } catch {
    try {
      const musicDir = new Directory(Paths.document, 'music');
      if (!musicDir.exists) {
        musicDir.create({ idempotent: true, intermediates: true });
      }
      const dest = uniqueDest(musicDir, rawName);
      const source = new File(asset.uri);
      source.copySync(dest);
      return dest.uri;
    } catch {
      return asset.uri;
    }
  }
}

type LibraryContextValue = {
  tracks: Track[];
  playlists: Playlist[];
  favoriteTracks: Track[];
  recentIds: string[];
  lastPlayedId?: string;
  loading: boolean;
  scanStatus: string | null;
  importAudio: () => Promise<{ added: number; canceled: boolean }>;
  importFromDevice: () => Promise<DeviceImportResult>;
  toggleFavorite: (id: string) => void;
  incrementPlay: (id: string) => void;
  removeTrack: (id: string) => Promise<void>;
  updateTrack: (id: string, patch: Partial<Pick<Track, 'title' | 'artist' | 'album' | 'genre'>>) => void;
  createPlaylist: (name: string, description?: string) => string;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string, description?: string) => void;
  addToPlaylist: (playlistId: string, trackIds: string[]) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  updateDuration: (id: string, duration: number) => void;
  restorePlaylist: (p: Playlist) => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LibraryData>(EMPTY_LIBRARY);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [lastPlayedId, setLastPlayedId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      const [library, recent, lastPlayed] = await Promise.all([
        loadJSON<LibraryData>(KEYS.library, EMPTY_LIBRARY),
        loadRawJSON<string[]>(KEYS.recentTracks, []),
        loadRawJSON<string>(KEYS.lastPlayed, ''),
      ]);
      // Nettoyage : ne conserver que les ids valides
      const valid = new Set(library.tracks.map((t) => t.id));
      setState({
        tracks: library.tracks,
        playlists: library.playlists
          .map((p) => ({ ...p, trackIds: p.trackIds.filter((id) => valid.has(id)) }))
          .filter((p) => p.name.trim()),
      });
      setRecentIds(recent.filter((id) => valid.has(id)));
      setLastPlayedId(lastPlayed || undefined);
      hydrated.current = true;
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    saveJSON(KEYS.library, state);
  }, [state]);

  const importAudio = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*', 'application/octet-stream'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return { added: 0, canceled: true };

    const assets = result.assets ?? [];
    const existing = new Set(state.tracks.map((t) => `${t.artist} — ${t.title} — ${t.size ?? ''}`));
    const addedTracks: Track[] = [];

    const CONCURRENCY = 3;
    const batch = async (asset: DocumentPicker.DocumentPickerAsset) => {
      try {
        const name = asset.name ?? 'audio';
        const uri = await persistPickedAudio(asset);
        const { artist, title, album } = parseTrackName(name);
        const key = `${artist} — ${title} — ${asset.size ?? ''}`;
        if (existing.has(key)) return;
        existing.add(key);

        const duration = uri ? await readAudioDuration(uri) : undefined;
        addedTracks.push({
          id: genId('trk'),
          title,
          artist,
          album: album ?? derivedAlbum({ artist }),
          duration,
          uri,
          size: asset.size,
          hue: hashHue(uri ?? name),
          favorite: false,
          addedAt: Date.now(),
          playCount: 0,
        });
      } catch {
        // un échec d'import n'interrompt pas les suivants
      }
    };

    for (let i = 0; i < assets.length; i += CONCURRENCY) {
      const chunk = assets.slice(i, i + CONCURRENCY);
      await Promise.allSettled(chunk.map(batch));
    }
    if (addedTracks.length) {
      setState((prev) => ({ ...prev, tracks: [...addedTracks, ...prev.tracks] }));
    }
    return { added: addedTracks.length, canceled: false };
  }, [state.tracks]);

  const importFromDevice = useCallback(async (): Promise<DeviceImportResult> => {
    if (Platform.OS === 'web') return { denied: true, found: 0, added: 0 };
    try {
      const granted = await requestDeviceAudioPermission();
      if (!granted) return { denied: true, found: 0, added: 0 };
    } catch {
      return { denied: true, found: 0, added: 0 };
    }

    const existing = new Set(
      state.tracks.map((t) => `${t.title}__${t.artist}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    );

    setScanStatus('Analyse des sons du téléphone…');
    const scanned = await scanDeviceAudio((n) => {
      setScanStatus(`Analyse… ${n} fichier(s) trouvé(s)`);
    });

    const importable = scanned.filter((item) => {
      const { artist, title } = parseTrackName(item.filename);
      const key = `${title}__${artist}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return !existing.has(key) && isMeaningfulAudio(item);
    });

    let added = 0;
    const CHUNK = 40;
    for (let i = 0; i < importable.length; i += CHUNK) {
      const slice = importable.slice(i, i + CHUNK);
      const batch: Track[] = [];
      for (const item of slice) {
        try {
          const uri = await persistScannedAudio(item);
          if (!uri) continue;
          const { artist, title, album } = parseTrackName(item.filename);
          const key = `${title}__${artist}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (existing.has(key)) continue;
          existing.add(key);

          let duration = item.durationSec;
          if (duration == null && uri.startsWith('file:')) {
            duration = await readAudioDuration(uri);
          }
          const size = uri.startsWith('file:') ? (new File(uri).size ?? undefined) : undefined;
          batch.push({
            id: genId('trk'),
            title,
            artist,
            album: album ?? derivedAlbum({ artist }),
            duration,
            uri,
            size,
            hue: hashHue(uri ?? item.filename),
            favorite: false,
            addedAt: Date.now(),
            playCount: 0,
          });
          added += 1;
        } catch {
          // un échec n'interrompt pas l'import
        }
      }
      if (batch.length) {
        setState((prev) => ({ ...prev, tracks: [...batch, ...prev.tracks] }));
      }
      setScanStatus(`Ajout de ${added}/${importable.length}…`);
    }
    setScanStatus(null);
    return { denied: false, found: scanned.length, added };
  }, [state.tracks]);

  const updateDuration = useCallback((id: string, duration: number) => {
    setState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === id && !t.duration ? { ...t, duration } : t)),
    }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === id ? { ...t, favorite: !t.favorite } : t)),
    }));
  }, []);

  const incrementPlay = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === id ? { ...t, playCount: t.playCount + 1 } : t)),
    }));
    setRecentIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 50));
    setLastPlayedId(id);
  }, []);

  const removeTrack = useCallback(async (id: string) => {
    const target = state.tracks.find((t) => t.id === id);
    setState((prev) => ({
      tracks: prev.tracks.filter((t) => t.id !== id),
      playlists: prev.playlists.map((p) => ({ ...p, trackIds: p.trackIds.filter((x) => x !== id) })),
    }));
    setRecentIds((prev) => prev.filter((x) => x !== id));
    if (target?.uri && Platform.OS !== 'web') {
      try {
        const file = new File(target.uri);
        if (file.exists) file.delete();
      } catch {
        // ignore
      }
    }
  }, [state.tracks]);

  const updateTrack = useCallback((id: string, patch: Partial<Pick<Track, 'title' | 'artist' | 'album' | 'genre'>>) => {
    setState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t };
        if (patch.title !== undefined) next.title = patch.title.trim() || t.title;
        if (patch.artist !== undefined) next.artist = patch.artist.trim() || t.artist;
        if (patch.album !== undefined) next.album = patch.album.trim() || t.album;
        if (patch.genre !== undefined) {
          const g = patch.genre.trim();
          next.genre = g || undefined;
        }
        return next;
      }),
    }));
  }, []);

  const createPlaylist = useCallback((name: string, description?: string) => {
    const id = genId('pl');
    setState((prev) => ({
      ...prev,
      playlists: [
        ...prev.playlists,
        { id, name, description, trackIds: [], createdAt: Date.now(), updatedAt: Date.now() },
      ],
    }));
    return id;
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setState((prev) => ({ ...prev, playlists: prev.playlists.filter((p) => p.id !== id) }));
  }, []);

  const renamePlaylist = useCallback((id: string, name: string, description?: string) => {    const clean = name.trim();
    if (!clean) return;
    setState((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) =>
        p.id === id ? { ...p, name: clean, ...(description === undefined ? {} : { description }), updatedAt: Date.now() } : p
      ),
    }));
  }, []);

  const addToPlaylist = useCallback((playlistId: string, trackIds: string[]) => {
    setState((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) =>
        p.id === playlistId
          ? {
              ...p,
              trackIds: [...new Set([...p.trackIds, ...trackIds])],
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  }, []);

  const removeFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setState((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() }
          : p
      ),
    }));
  }, []);

  const restorePlaylist = useCallback((p: Playlist) => {
    setState((prev) => {
      const exists = prev.playlists.some((x) => x.id === p.id);
      return exists ? prev : { ...prev, playlists: [...prev.playlists, p] };
    });
  }, []);

  const value = useMemo<LibraryContextValue>(() => {
    const favoriteTracks = state.tracks.filter((t) => t.favorite);
    return {
      tracks: state.tracks,
      playlists: state.playlists,
      favoriteTracks,
      recentIds,
      lastPlayedId,
      loading,
      scanStatus,
      importAudio,
      importFromDevice,
      toggleFavorite,
      incrementPlay,
      removeTrack,
      updateTrack,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      updateDuration,
      restorePlaylist,
    };
  }, [
    state,
    recentIds,
    lastPlayedId,
    loading,
    scanStatus,
    importAudio,
    importFromDevice,
    toggleFavorite,
    incrementPlay,
    removeTrack,
    updateTrack,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    updateDuration,
    restorePlaylist,
  ]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary doit être utilisé dans <LibraryProvider>');
  return ctx;
}