import {
  createAudioPlayer,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayerStatus,
} from 'expo-audio';
import type { AudioPlayer, AudioStatus } from 'expo-audio';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useLibrary } from '@/context/library-context';
import { useSettings } from '@/context/settings-context';
import { KEYS, loadRawJSON, saveJSON } from '@/lib/storage';
import { clamp01 } from '@/lib/utils';
import type { RepeatMode, Track } from '@/lib/types';

type PersistedQueue = {
  queue: string[];
  index: number;
  shuffle: boolean;
  repeat: RepeatMode;
};

const DEFAULT_PREFS: PersistedQueue = { queue: [], index: 0, shuffle: false, repeat: 'off' };

type PlayerContextValue = {
  currentTrack: Track | null;
  queue: string[];
  queueIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  hydrated: boolean;
  playTrack: (track: Track, contextIds?: string[]) => void;
  playQueue: (ids: string[], startId?: string) => void;
  addToQueue: (ids: string[]) => void;
  togglePlay: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  seekTo: (seconds: number) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

let persistentPlayer: AudioPlayer | null = null;

function getPlayer() {
  if (!persistentPlayer) {
    persistentPlayer = createAudioPlayer(null, {
      updateInterval: 200,
      preferredForwardBufferDuration: 2,
    });
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
  }
  return persistentPlayer;
}

/**
 * Écrit le volume maître sur le lecteur singleton.
 * Passe par le module (et non la closure du composant) car l'instance
 * AudioPlayer est un objet mutable : l'affecter depuis un rendu React
 * viole la règle react-hooks/immutability du compilateur.
 */
function setPlayerVolume(value: number) {
  try {
    if (persistentPlayer) {
      persistentPlayer.volume = clamp01(value);
    }
  } catch {
    // ignore
  }
}

if (Platform.OS === 'android') {
  requestNotificationPermissionsAsync().catch(() => {});
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const library = useLibrary();
  const settings = useSettings();
  const [player] = useState(() => getPlayer());
  const status = useAudioPlayerStatus(player);

  const volumeRampRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const computedTarget = clamp01(settings.volume * (settings.loudness ? 0.85 : 1) * (1 + settings.bassBoost * 0.5));

  const rampVolume = useCallback(
    (from: number, to: number, ms: number) => {
      if (volumeRampRef.current) clearInterval(volumeRampRef.current);
      volumeRampRef.current = null;
      setPlayerVolume(from);
      const steps = Math.max(1, Math.round(ms / 30));
      let i = 0;
      volumeRampRef.current = setInterval(() => {
        i += 1;
        const t = i / steps;
        setPlayerVolume(from + (to - from) * t);
        if (i >= steps && volumeRampRef.current) {
          clearInterval(volumeRampRef.current);
          volumeRampRef.current = null;
        }
      }, 30);
    },
    []
  );

  const applyMasterGain = useCallback(
    (ramp = false) => {
      rampVolume(ramp ? 0 : settings.volume, computedTarget, ramp ? 450 : 0);
    },
    [rampVolume, settings.volume, computedTarget]
  );

  // Applique le volume / normalisation / bass boost
  useEffect(() => {
    applyMasterGain(false);
  }, [applyMasterGain]);

  useEffect(() => {
    return () => {
      if (volumeRampRef.current) clearInterval(volumeRampRef.current);
    };
  }, []);

  const [naturalIds, setNaturalIds] = useState<string[]>([]);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [shuffle, setShuffle] = useState(DEFAULT_PREFS.shuffle);
  const [repeat, setRepeat] = useState<RepeatMode>(DEFAULT_PREFS.repeat);
  const [hydrated, setHydrated] = useState(false);

  const orderIdsRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const repeatRef = useRef<RepeatMode>('off');
  const advancedFromRef = useRef<string | null>(null);
  useEffect(() => {
    orderIdsRef.current = orderIds;
  }, [orderIds]);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  const currentId = orderIds[index] ?? null;
  const currentTrack = useMemo(
    () => (currentId ? library.tracks.find((t) => t.id === currentId) ?? null : null),
    [library.tracks, currentId]
  );

  // --- Restauration de session (attend que la bibliothèque soit chargée)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (library.loading || restoredRef.current) return;
    restoredRef.current = true;
    let alive = true;
    (async () => {
      const prefs = await loadRawJSON<PersistedQueue>(KEYS.queue, DEFAULT_PREFS);
      if (!alive) return;
      const valid = new Set(library.tracks.map((t) => t.id));
      const queue = prefs.queue.filter((id) => valid.has(id));
      setNaturalIds(queue);
      setOrderIds(queue);
      setIndex(Math.min(prefs.index, Math.max(0, queue.length - 1)));
      setShuffle(prefs.shuffle);
      setRepeat(prefs.repeat);
      if (queue.length) {
        const track = library.tracks.find((t) => t.id === queue[Math.min(prefs.index, queue.length - 1)]);
        if (track?.uri) {
          try {
            player.replace({ uri: track.uri });
          } catch {
            // ignore
          }
        }
      }
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, [library.loading, library.tracks, player]);

  // --- Persistance
  useEffect(() => {
    if (!hydrated) return;
    saveJSON(KEYS.queue, { queue: orderIds, index, shuffle, repeat } satisfies PersistedQueue);
  }, [orderIds, index, shuffle, repeat, hydrated]);

  // --- Hygiène de file : purge des pistes supprimées de la bibliothèque
  useEffect(() => {
    if (!hydrated) return;
    const valid = new Set(library.tracks.map((t) => t.id));
    const kept = orderIds.filter((id) => valid.has(id));
    if (kept.length === orderIds.length) return;
    const t = setTimeout(() => {
      if (!kept.length) {
        setNaturalIds([]);
        setOrderIds([]);
        setIndex(0);
        try {
          player.pause();
          player.replace(null);
        } catch {
          // ignore
        }
        return;
      }
      const naturalKept = naturalIds.filter((id) => valid.has(id));
      setNaturalIds(naturalKept);
      setOrderIds(kept);
      if (index >= kept.length) setIndex(0);
    }, 0);
    return () => clearTimeout(t);
  }, [library.tracks, orderIds, naturalIds, index, hydrated, player]);

  const loadAndPlay = useCallback(
    (track: Track | null, autoplay: boolean) => {
      if (!track?.uri) {
        try {
          player.pause();
          player.replace(null);
        } catch {
          // ignore
        }
        return;
      }
      try {
        player.replace({ uri: track.uri });
      } catch {
        // ignore
      }
      try {
        player.setActiveForLockScreen(true, {
          title: track.title,
          artist: track.artist,
          albumTitle: track.album,
        });
        player.updateLockScreenMetadata({
          title: track.title,
          artist: track.artist,
          albumTitle: track.album,
        });
      } catch {
        // ignore
      }
      if (autoplay) {
        if (settings.fadeInOut) {
          setPlayerVolume(0);
          player.play();
          library.incrementPlay(track.id);
          rampVolume(0, computedTarget, 500);
        } else {
          player.play();
          library.incrementPlay(track.id);
        }
      }
    },
    [player, library, rampVolume, computedTarget, settings.fadeInOut]
  );

  // --- Synchro des durées manquantes
  useEffect(() => {
    if (status.duration > 0 && currentTrack) {
      library.updateDuration(currentTrack.id, status.duration);
    }
  }, [status.duration, currentTrack, library]);

  // --- Avance automatique à la fin d'un morceau (via souscription, pas d'effet setState)
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (st) => {
      if (!st.didJustFinish) {
        advancedFromRef.current = null;
        return;
      }
      const order = orderIdsRef.current;
      const current = order[indexRef.current] ?? null;
      if (!current || advancedFromRef.current === current) return;
      advancedFromRef.current = current;

      const trackAt = (i: number) => library.tracks.find((t) => t.id === order[i]) ?? null;

      if (repeatRef.current === 'one') {
        player.seekTo(0);
        try {
          player.play();
        } catch {
          // ignore
        }
        return;
      }

      if (indexRef.current >= order.length - 1) {
        if (repeatRef.current === 'all' && order.length) {
          setIndex(0);
          loadAndPlay(trackAt(0), true);
        } else {
          player.pause();
          player.seekTo(0);
        }
        return;
      }
      const next = indexRef.current + 1;
      setIndex(next);
      loadAndPlay(trackAt(next), true);
    });
    return () => {
      sub.remove();
    };
  }, [player, library, loadAndPlay]);

  // --- ACTIONS

  const playQueue = useCallback(
    (ids: string[], startId?: string) => {
      const valid = ids.filter((id) => library.tracks.some((t) => t.id === id));
      if (!valid.length) {
        setNaturalIds([]);
        setOrderIds([]);
        setIndex(0);
        try {
          player.pause();
          player.replace(null);
        } catch {
          // ignore
        }
        return;
      }
      const start = startId && valid.includes(startId) ? startId : valid[0];
      setNaturalIds(valid);
      if (shuffle) {
        const rest = valid.filter((id) => id !== start);
        for (let i = rest.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        setOrderIds([start, ...rest]);
        setIndex(0);
      } else {
        setOrderIds(valid);
        setIndex(valid.indexOf(start));
      }
      const track = library.tracks.find((t) => t.id === start);
      loadAndPlay(track ?? null, true);
    },
    [library, shuffle, loadAndPlay, player]
  );

  const playTrack = useCallback(
    (track: Track, contextIds?: string[]) => {
      const ids = contextIds && contextIds.length ? contextIds : [track.id];
      playQueue(ids, track.id);
    },
    [playQueue]
  );

  const togglePlay = useCallback(() => {
    if (!hydrated) return;
    if (player.playing) {
      if (settings.fadeInOut) {
        rampVolume(settings.volume, 0, 180);
        setTimeout(() => {
          try {
            player.pause();
          } catch {
            // ignore
          }
          setPlayerVolume(computedTarget);
        }, 220);
      } else {
        player.pause();
      }
    } else {
      player.play();
      if (currentTrack) library.incrementPlay(currentTrack.id);
      if (settings.fadeInOut) {
        rampVolume(0, computedTarget, 350);
      }
    }
  }, [hydrated, currentTrack, library, player, settings.fadeInOut, rampVolume, settings.volume, computedTarget]);

  const addToQueue = useCallback(
    (ids: string[]) => {
      const valid = ids.filter(
        (id) => library.tracks.some((t) => t.id === id) && !orderIds.includes(id)
      );
      if (!valid.length) return;
      if (!orderIds.length) {
        playQueue([...valid], valid[0]);
        return;
      }
      setNaturalIds((prev) => [...prev, ...valid]);
      setOrderIds((prev) => [...prev, ...valid]);
    },
    [library.tracks, orderIds, playQueue]
  );

  const skipNext = useCallback(() => {
    if (!orderIds.length) return;
    if (repeat === 'one') {
      player.seekTo(0);
      return;
    }
    const trackAt = (i: number) => library.tracks.find((t) => t.id === orderIds[i]) ?? null;
    if (index >= orderIds.length - 1) {
      if (repeat === 'all') {
        setIndex(0);
        loadAndPlay(trackAt(0), true);
      } else {
        player.pause();
        player.seekTo(0);
      }
      return;
    }
    const next = index + 1;
    setIndex(next);
    loadAndPlay(trackAt(next), true);
  }, [orderIds, index, repeat, library, loadAndPlay, player]);

  const skipPrevious = useCallback(() => {
    if (!orderIds.length) return;
    if (player.currentTime > 3) {
      player.seekTo(0);
      return;
    }
    const trackAt = (i: number) => library.tracks.find((t) => t.id === orderIds[i]) ?? null;
    if (index > 0) {
      const prev = index - 1;
      setIndex(prev);
      loadAndPlay(trackAt(prev), true);
    } else if (repeat === 'all') {
      const last = orderIds.length - 1;
      setIndex(last);
      loadAndPlay(trackAt(last), true);
    } else {
      player.seekTo(0);
    }
  }, [orderIds, index, repeat, library, loadAndPlay, player]);

  const seekTo = useCallback(
    (seconds: number) => {
      player.seekTo(Math.max(0, seconds));
    },
    [player]
  );

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  const toggleShuffle = useCallback(() => {
    if (shuffle) {
      setOrderIds(naturalIds);
      const pos = currentId ? naturalIds.indexOf(currentId) : 0;
      setIndex(pos >= 0 ? pos : 0);
      setShuffle(false);
    } else {
      if (!orderIds.length) return;
      const start = currentId ?? orderIds[0];
      const rest = orderIds.filter((id) => id !== start);
      for (let i = rest.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      setOrderIds([start, ...rest]);
      setIndex(0);
      setShuffle(true);
    }
  }, [shuffle, naturalIds, orderIds, currentId]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      queue: orderIds,
      queueIndex: index,
      isPlaying: status.playing,
      isBuffering: status.isBuffering,
      position: status.currentTime,
      duration: status.duration,
      volume: settings.volume,
      shuffle,
      repeat,
      hydrated,
      playTrack,
      playQueue,
      addToQueue,
      togglePlay,
      skipNext,
      skipPrevious,
      seekTo,
      cycleRepeat,
      toggleShuffle,
    }),
    [
      currentTrack,
      orderIds,
      index,
      status.playing,
      status.isBuffering,
      status.currentTime,
      status.duration,
      settings.volume,
      shuffle,
      repeat,
      hydrated,
      playTrack,
      playQueue,
      addToQueue,
      togglePlay,
      skipNext,
      skipPrevious,
      seekTo,
      cycleRepeat,
      toggleShuffle,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer doit être utilisé dans <PlayerProvider>');
  return ctx;
}

export type { AudioStatus };