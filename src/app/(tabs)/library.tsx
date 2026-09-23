import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/artwork';
import { EmptyState } from '@/components/empty-state';
import { PrimaryButton } from '@/components/primary-button';
import { TrackMenu } from '@/components/track-menu';
import { TrackRow } from '@/components/track-row';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useLibrary } from '@/context/library-context';
import { usePlayer } from '@/context/player-context';
import { useAppStyles } from '@/context/theme-context';
import { artistSummary, searchTracks } from '@/lib/discover';
import { hashHue, titleCount, trackInitials } from '@/lib/utils';
import type { Playlist, Track } from '@/lib/types';

type Filter = 'tous' | 'playlists' | 'likes' | 'albums' | 'artistes';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'likes', label: 'Titres likés' },
  { key: 'albums', label: 'Albums' },
  { key: 'artistes', label: 'Artistes' },
];

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const library = useLibrary();
  const player = usePlayer();
  const [filter, setFilter] = useState<Filter>('tous');
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const q = query.trim();

  const playlists = useMemo(
    () =>
      library.playlists
        .map((p) => ({
          playlist: p,
          tracks: p.trackIds.map((id) => library.tracks.find((t) => t.id === id)).filter((t): t is Track => Boolean(t)),
        }))
        .filter(
          (x) =>
            !q ||
            x.playlist.name.toLowerCase().includes(q.toLowerCase()) ||
            x.tracks.some((t) => t.title.toLowerCase().includes(q.toLowerCase()))
        ),
    [library.playlists, library.tracks, q]
  );

  const filteredTracks = useMemo(() => searchTracks(library.tracks, q), [library.tracks, q]);

  const albums = useMemo(() => {
    const map = new Map<string, Track[]>();
    for (const t of filteredTracks) {
      const key = t.album;
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return [...map.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, list]) => ({ name, tracks: list }));
  }, [filteredTracks]);

  const artists = useMemo(() => artistSummary(filteredTracks, 30), [filteredTracks]);

  const playTracks = (ids: string[], startId?: string) => {
    if (!ids.length) return;
    player.playQueue(ids, startId);
    router.push('/player');
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await library.importAudio();
      if (result.canceled) return;
      Alert.alert(
        result.added ? 'Import terminé' : 'Rien de nouveau',
        result.added
          ? result.added > 1
            ? `${result.added} titres ajoutés à votre bibliothèque.`
            : '1 titre ajouté à votre bibliothèque.'
          : 'Ces morceaux sont déjà présents dans votre bibliothèque.'
      );
    } finally {
      setImporting(false);
    }
  };

  const handleDeviceScan = async () => {
    setScanning(true);
    try {
      const result = await library.importFromDevice();
      if (result.denied) {
        Alert.alert('Permission refusée', 'Autorisez l’accès audio pour analyser les sons de votre téléphone.');
      } else if (result.added > 0) {
        Alert.alert('Import terminé', `${result.found} fichier(s) audio trouvé(s), ${result.added} ajouté(s) à la bibliothèque.`);
      } else if (result.found > 0) {
        Alert.alert('Rien de nouveau', `${result.found} fichier(s) audio trouvé(s) : ils sont déjà dans votre bibliothèque.`);
      } else {
        Alert.alert('Aucun son trouvé', 'Aucun fichier audio lisible n’a été trouvé sur cet appareil.');
      }
    } finally {
      setScanning(false);
    }
  };

  const openImportOptions = () => {
    const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];
    if (Platform.OS !== 'web') {
      options.push({ text: 'Analyser les sons du téléphone', onPress: handleDeviceScan });
      options.push({ text: 'Importer des fichiers', onPress: handleImport });
    } else {
      options.push({ text: 'Importer des fichiers', onPress: handleImport });
    }
    options.push({ text: 'Annuler', style: 'cancel' });
    Alert.alert('Ajouter de la musique', 'Rendez vos morceaux disponibles dans Aura Vibe.', options);
  };

  const createPlaylist = () => {
    if (!library.tracks.length) return;
    const id = library.createPlaylist(`Ma playlist ${library.playlists.length + 1}`);
    router.push({ pathname: '/playlist/[id]', params: { id } });
  };

  const confirmDeletePlaylist = (p: Playlist) => {
    Alert.alert('Supprimer cette playlist ?', `« ${p.name} » sera définitivement supprimée.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => library.deletePlaylist(p.id) },
    ]);
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.eyebrow}>Collection personnelle</Text>
          <Text style={[typography.headlineLgMobile, styles.title]}>Votre Bibliothèque</Text>
        </View>
        <Pressable
          style={[styles.iconBtn, !library.tracks.length && { opacity: 0.45 }]}
          onPress={createPlaylist}
          disabled={!library.tracks.length}
          hitSlop={6}>
          <MaterialIcons name="add" size={22} color={colors.onPrimary} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}>
            <Text style={[styles.chipText, filter === f.key && { color: colors.onPrimary, fontFamily: fonts.bodySemi }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {filter === 'likes' && library.favoriteTracks.length ? (
        <Pressable
          style={styles.favsCard}
          onPress={() => playTracks(library.favoriteTracks.map((t) => t.id))}
          onLongPress={() => setFilter('likes')}>
          <View style={styles.favsHalo} />
          <Artwork hue={330} initials="♥" size={52} radiusValue={radius.md} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.favsTitle}>Titres favoris</Text>
            <Text style={styles.favsCount}>{titleCount(library.favoriteTracks.length)} sauvegardés</Text>
          </View>
          <View style={styles.shuffleBtn}>
            <MaterialIcons name="shuffle" size={22} color={colors.onPrimary} />
          </View>
        </Pressable>
      ) : null}

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color={colors.outline} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher dans votre collection..."
          placeholderTextColor={colors.outline}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={colors.primary}
        />
      </View>

      {filter === 'tous' && library.tracks.length ? (
        <View style={styles.quickRow}>
          <PrimaryButton
            small
            label="Importer"
            icon="file-download"
            onPress={openImportOptions}
            loading={importing || scanning}
          />
          <PrimaryButton small label={`Tout lire (${library.tracks.length})`} icon="play-arrow" onPress={() => playTracks(library.tracks.map((t) => t.id))} />
        </View>
      ) : null}

      {library.scanStatus ? (
        <View style={styles.scanRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text numberOfLines={2} style={styles.scanText}>
            {library.scanStatus}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const footerGap = <View style={{ height: 150 + insets.bottom }} />;

  if (filter !== 'tous' && filter !== 'playlists' && !filteredTracks.length) {
    return (
      <View style={styles.root}>
        <FlatList
          data={[]}
          ListHeaderComponent={
            <View>
              {header}
              <EmptyState
                icon={filter === 'likes' ? 'favorite' : filter === 'artistes' ? 'people' : 'album'}
                title="Rien à afficher"
                message={filter === 'likes' ? 'Mettez des titres en favori pour les retrouver ici.' : "Ajoutez de la musique pour remplir cette vue."}
              >
                {!library.tracks.length ? (
                  <PrimaryButton label="Importer de la musique" icon="file-download" onPress={openImportOptions} loading={importing || scanning} />
                ) : null}
              </EmptyState>
            </View>
          }
          renderItem={() => null}
          ListFooterComponent={footerGap}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    );
  }

  const data: { key: string; type: 'playlist' | 'track' | 'album' | 'artist'; playlist?: Playlist; tracks: Track[]; name?: string }[] = [];
  if (filter === 'playlists') {
    for (const p of playlists) data.push({ key: p.playlist.id, type: 'playlist', playlist: p.playlist, tracks: p.tracks });
  } else if (filter === 'likes') {
    for (const t of library.favoriteTracks.filter((t) => !q || filteredTracks.some((x) => x.id === t.id)))
      data.push({ key: t.id, type: 'track', tracks: [t] });
  } else if (filter === 'albums') {
    for (const a of albums) data.push({ key: `alb_${a.name}`, type: 'album', tracks: a.tracks, name: a.name });
  } else if (filter === 'artistes') {
    for (const a of artists) data.push({ key: `art_${a.artist}`, type: 'artist', tracks: a.tracks, name: a.artist });
  } else {
    for (const t of filteredTracks) data.push({ key: t.id, type: 'track', tracks: [t] });
    for (const p of playlists) data.push({ key: `pl_${p.playlist.id}`, type: 'playlist', playlist: p.playlist, tracks: p.tracks });
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          filter === 'tous' && !data.length ? (
            <View>
              {header}
              <EmptyState
                icon="library-music"
                title="Votre bibliothèque est vide"
                message="Ajoutez des fichiers audio locaux : ils seront copiés et lisibles hors ligne."
              >
                <PrimaryButton label="Importer de la musique" icon="file-download" onPress={openImportOptions} loading={importing || scanning} />
              </EmptyState>
            </View>
          ) : (
            header
          )
        }
        ListFooterComponent={footerGap}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          if (item.type === 'track' && item.tracks[0]) {
            const track = item.tracks[0];
            return (
              <TrackRow
                track={track}
                isCurrent={player.currentTrack?.id === track.id}
                isPlaying={player.isPlaying}
                onPress={() => playTracks(filteredTracks.map((t) => t.id), track.id)}
                onFavorite={() => library.toggleFavorite(track.id)}
                onMore={() => setMenuTrack(track)}
                showAlbum
              />
            );
          }
          if (item.type === 'playlist') {
            const pl = item.playlist!;
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: pl.id } })}>
                <Artwork hue={hashHue(pl.name)} initials={trackInitials(pl.name)} size={52} radiusValue={radius.md} iconSize={20} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[typography.bodyLg, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                    {pl.name}
                  </Text>
                  <View style={styles.playlistMeta}>
                    <MaterialIcons name="offline-pin" size={13} color={colors.secondary} />
                    <Text style={styles.playlistSub}>
                      {titleCount(item.tracks.length)} • Mis à jour {item.tracks.length ? 'récemment' : "à l'instant"}
                    </Text>
                  </View>
                </View>
                <Pressable hitSlop={8} onPress={() => confirmDeletePlaylist(pl)}>
                  <MaterialIcons name="more-vert" size={20} color={colors.outline} />
                </Pressable>
              </Pressable>
            );
          }
          if (item.type === 'album') {
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => playTracks(item.tracks.map((t) => t.id))}>
                <Artwork hue={hashHue(item.name ?? '')} initials={trackInitials(item.name ?? 'Album')} size={52} radiusValue={radius.md} iconSize={20} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[typography.bodyLg, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                    {item.name}
                  </Text>
                  <Text style={styles.playlistSub}>{titleCount(item.tracks.length)} • Hors-ligne</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
              </Pressable>
            );
          }
          const name = item.name!;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => playTracks(item.tracks.map((t) => t.id))}>
              <Artwork hue={hashHue(name)} initials={trackInitials(name)} size={52} radiusValue={999} iconSize={20} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[typography.bodyLg, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                  {name}
                </Text>
                <Text style={styles.playlistSub}>{titleCount(item.tracks.length)}</Text>
              </View>
              <MaterialIcons name="north-east" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          );
        }}
      />
      <TrackMenu track={menuTrack} visible={Boolean(menuTrack)} onClose={() => setMenuTrack(null)} />
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.md, gap: 2 },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: fonts.bodySemi,
  },
  title: {
    color: colors.onSurface,
    fontFamily: fonts.headline,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: fonts.body,
  },
  favsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLow,
  },
  favsHalo: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(247,81,161,0.25)',
  },
  favsTitle: {
    color: '#FFFFFF',
    fontFamily: fonts.headlineSemi,
    fontSize: 16,
  },
  favsCount: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 1,
  },
  shuffleBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gradientEnd,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: {
    flex: 1,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLow,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scanText: {
    flex: 1,
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  rowPressed: {
    backgroundColor: colors.surfaceHigh,
  },
  playlistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  playlistSub: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
});