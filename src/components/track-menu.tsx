import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/artwork';
import { PrimaryButton } from '@/components/primary-button';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useLibrary } from '@/context/library-context';
import { usePlayer } from '@/context/player-context';
import { useAppStyles } from '@/context/theme-context';
import type { Track } from '@/lib/types';
import { artworkInitials, formatBytes, formatTime, hslToHex } from '@/lib/utils';

type Props = {
  track: Track | null;
  visible: boolean;
  playlistId?: string;
  onClose: () => void;
};

type View3 = 'actions' | 'playlists' | 'info' | 'edit';

export function TrackMenu({ track, visible, playlistId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useAppStyles(createStyles);
  const library = useLibrary();
  const player = usePlayer();
  const [view, setView] = useState<View3>('actions');
  const [prevVisible, setPrevVisible] = useState(visible);
  const [draft, setDraft] = useState({ title: '', artist: '', album: '', genre: '' });

  if (prevVisible !== visible) {
    setPrevVisible(visible);
    if (!visible) setView('actions');
  }

  if (!track) return null;

  const close = () => onClose();
  const accent = hslToHex(track.hue, 70, 62);
  const accentSoft = hslToHex(track.hue, 65, 18);

  const startOver = () => {
    setView('actions');
    close();
  };

  const current = player.currentTrack?.id === track.id;
  const queued = player.queue.includes(track.id);

  const queueTrack = () => {
    if (queued) {
      close();
      return;
    }
    player.addToQueue([track.id]);
    close();
  };

  const removeFromLibrary = () => {
    Alert.alert('Supprimer ce morceau ?', `« ${track.title} » sera retiré de la bibliothèque et son fichier effacé.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          if (current) {
            player.playQueue([]);
          }
          library.removeTrack(track.id);
          startOver();
        },
      },
    ]);
  };

  const inPlaylist = playlistId
    ? library.playlists.find((p) => p.id === playlistId)?.trackIds.includes(track.id) ?? false
    : false;

  const addToPlaylist = (playlistId: string) => {
    library.addToPlaylist(playlistId, [track.id]);
    startOver();
  };

  const removeFromThisPlaylist = () => {
    if (!playlistId) return;
    library.removeFromPlaylist(playlistId, track.id);
    close();
  };

  const createPlaylistWithTrack = () => {
    const id = library.createPlaylist(`Ma playlist ${library.playlists.length + 1}`);
    library.addToPlaylist(id, [track.id]);
    startOver();
  };

  const openEdit = () => {
    setDraft({
      title: track.title,
      artist: track.artist,
      album: track.album,
      genre: track.genre ?? '',
    });
    setView('edit');
  };

  const saveEdit = () => {
    if (!draft.title.trim()) {
      Alert.alert('Titre requis', 'Le morceau doit garder un titre.');
      return;
    }
    library.updateTrack(track.id, draft);
    startOver();
  };

  const rows: { key: string; label: string; sub: string; icon: string; tint: string; onPress: () => void; trailing?: 'check' | 'chevron' | 'none'; danger?: boolean }[] =
    view === 'actions'
      ? [
          {
            key: 'queue',
            label: queued ? 'Déjà dans la file' : 'Ajouter à la file',
            sub: queued ? `${player.queue.length} titres en attente` : 'Jouer juste après le morceau en cours',
            icon: queued ? 'playlist-add-check' : 'playlist-add',
            tint: colors.primary,
            onPress: queueTrack,
            trailing: 'none',
          },
          {
            key: 'edit',
            label: 'Modifier les infos',
            sub: 'Titre, artiste, album, genre',
            icon: 'edit-note',
            tint: colors.primary,
            onPress: openEdit,
            trailing: 'chevron',
          },
          {
            key: 'info',
            label: 'Informations',
            sub: 'Durée, format, fichier',
            icon: 'info-outline',
            tint: colors.secondary,
            onPress: () => setView('info'),
            trailing: 'chevron',
          },
        ]
      : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.grabber} />
          <View style={[styles.trackMeta, { borderColor: accent }]}>
            <Artwork hue={track.hue} initials={artworkInitials(track)} size={46} radiusValue={radius.sm} iconSize={18} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[typography.bodyMd, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                {track.title}
              </Text>
              <Text numberOfLines={1} style={styles.trackSub}>
                {track.artist}
              </Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={view === 'actions' ? close : () => setView('actions')}
              hitSlop={8}>
              <MaterialIcons name={view === 'actions' ? 'close' : 'arrow-back'} size={20} color={colors.onSurface} />
            </Pressable>
          </View>

          {view === 'edit' ? (
            <View style={styles.editForm}>
              {(
                [
                  { key: 'title', label: 'Titre', placeholder: 'Titre du morceau' },
                  { key: 'artist', label: 'Artiste', placeholder: 'Nom de l’artiste' },
                  { key: 'album', label: 'Album', placeholder: 'Nom de l’album' },
                  { key: 'genre', label: 'Genre', placeholder: 'Rock, Jazz, Afrobeat...' },
                ] as const
              ).map((field) => (
                <View key={field.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={draft[field.key]}
                    onChangeText={(v) => setDraft((prev) => ({ ...prev, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.outline}
                    selectionColor={colors.primary}
                    maxLength={field.key === 'genre' ? 40 : 120}
                    autoCapitalize={field.key === 'genre' ? 'words' : 'sentences'}
                  />
                </View>
              ))}
              <View style={styles.editActions}>
                <PrimaryButton label="Enregistrer" icon="check" onPress={saveEdit} disabled={!draft.title.trim()} />
              </View>
            </View>
          ) : view === 'info' ? (
            <View style={[styles.infoCard, { backgroundColor: accentSoft, borderColor: accent }]}>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Titre</Text>
                <Text numberOfLines={1} style={styles.infoValue}>{track.title}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Artiste</Text>
                <Text numberOfLines={1} style={styles.infoValue}>{track.artist}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Album</Text>
                <Text numberOfLines={1} style={styles.infoValue}>{track.album || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Genre</Text>
                <Text numberOfLines={1} style={styles.infoValue}>{track.genre || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Durée</Text>
                <Text style={styles.infoValue}>{formatTime(track.duration)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Format</Text>
                <Text style={styles.infoValue}>{fileFormat(track.uri)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Taille</Text>
                <Text style={styles.infoValue}>{formatBytes(track.size)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Écoutes</Text>
                <Text style={styles.infoValue}>{track.playCount}</Text>
              </View>
              {track.uri ? (
                <Text numberOfLines={2} style={styles.infoPath} selectable>
                  {track.uri}
                </Text>
              ) : null}
            </View>
          ) : view === 'playlists' ? (
            <>
              <Pressable style={styles.actionRow} onPress={createPlaylistWithTrack}>
                <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                  <MaterialIcons name="add" size={20} color={colors.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMd, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                    Nouvelle playlist
                  </Text>
                  <Text style={styles.actionSub}>Créer une playlist avec ce morceau</Text>
                </View>
              </Pressable>
              <ScrollView style={styles.playlistList} bounces={false}>
                {library.playlists.map((p) => (
                  <Pressable key={p.id} style={styles.actionRow} onPress={() => addToPlaylist(p.id)}>
                    <View style={styles.playlistDot}>
                      <MaterialIcons name="queue-music" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={[typography.bodyMd, { color: colors.onSurface }]}>
                        {p.name}
                      </Text>
                      <Text style={styles.actionSub}>
                        {p.trackIds.length} {p.trackIds.length > 1 ? 'titres' : 'titre'}
                      </Text>
                    </View>
                    {p.trackIds.includes(track.id) ? (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    ) : (
                      <MaterialIcons name="playlist-add" size={20} color={colors.outline} />
                    )}
                  </Pressable>
                ))}
                {!library.playlists.length ? (
                  <Text style={styles.emptyNote}>Aucune playlist. Créez-en une avec le bouton ci-dessus.</Text>
                ) : null}
              </ScrollView>
            </>
          ) : (
            <>
              {rows.map((row) => (
                <Pressable key={row.key} style={styles.actionRow} onPress={row.onPress}>
                  <View style={[styles.actionIcon, { backgroundColor: withAlpha(row.tint, 0.16) }]}>
                    <MaterialIcons name={row.icon as never} size={20} color={row.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMd, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                      {row.label}
                    </Text>
                    <Text style={styles.actionSub}>{row.sub}</Text>
                  </View>
                  {row.trailing === 'chevron' ? <MaterialIcons name="chevron-right" size={20} color={colors.outline} /> : null}
                </Pressable>
              ))}

              <Pressable
                style={styles.actionRow}
                onPress={() => {
                  library.toggleFavorite(track.id);
                  close();
                }}>
                <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.favorite, 0.18) }]}>
                  <MaterialIcons
                    name={track.favorite ? 'favorite' : 'favorite-border'}
                    size={20}
                    color={track.favorite ? colors.favorite : colors.onSurfaceVariant}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMd, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                    {track.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  </Text>
                  <Text style={styles.actionSub}>Affiché dans « Titres likés »</Text>
                </View>
              </Pressable>

              {inPlaylist && playlistId ? (
                <Pressable style={styles.actionRow} onPress={removeFromThisPlaylist}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.surfaceHigh }]}>
                    <MaterialIcons name="playlist-remove" size={20} color={colors.onSurfaceVariant} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMd, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                      Retirer de cette playlist
                    </Text>
                    <Text style={styles.actionSub}>Reste disponible dans la bibliothèque</Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable style={styles.actionRow} onPress={() => setView('playlists')}>
                  <View style={[styles.actionIcon, { backgroundColor: withAlpha(colors.primary, 0.16) }]}>
                    <MaterialIcons name="playlist-add" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMd, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                      Ajouter à une playlist
                    </Text>
                    <Text style={styles.actionSub}>Ou créer une nouvelle playlist</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                </Pressable>
              )}

              <Pressable style={styles.actionRow} onPress={removeFromLibrary}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,120,120,0.14)' }]}>
                  <MaterialIcons name="delete-outline" size={20} color="#FF8A8A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMd, { color: '#FFB0B0', fontFamily: fonts.bodySemi }]}>
                    Supprimer de la bibliothèque
                  </Text>
                  <Text style={styles.actionSub}>Efface aussi le fichier local</Text>
                </View>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function fileFormat(uri?: string) {
  if (!uri) return '—';
  const clean = uri.split('?')[0];
  const ext = clean.slice(clean.lastIndexOf('.') + 1).toLowerCase();
  return ext ? ext.toUpperCase() : '—';
}

function withAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const createStyles = () => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.surfaceLow,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    maxHeight: '72%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: spacing.md,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  trackSub: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  infoCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 5,
  },
  infoKey: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: fonts.body,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    color: colors.onSurface,
    fontSize: 12,
    fontFamily: fonts.bodySemi,
  },
  infoPath: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: fonts.body,
    paddingVertical: spacing.xs,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSub: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 1,
  },
  playlistList: {
    flexGrow: 0,
    maxHeight: 280,
  },
  playlistDot: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(160,120,255,0.14)',
  },
  emptyNote: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  editForm: {
    gap: spacing.sm,
  },
  field: {
    gap: 5,
  },
  fieldLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    fontFamily: fonts.bodySemi,
  },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  editActions: {
    paddingTop: spacing.xs,
  },
});