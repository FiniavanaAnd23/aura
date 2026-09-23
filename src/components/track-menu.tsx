import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/artwork';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useLibrary } from '@/context/library-context';
import { usePlayer } from '@/context/player-context';
import { useAppStyles } from '@/context/theme-context';
import { formatTime, trackInitials } from '@/lib/utils';

type Props = {
  track: { id: string; title: string; artist: string; hue: number; favorite: boolean } | null;
  visible: boolean;
  playlistId?: string;
  onClose: () => void;
};

export function TrackMenu({ track, visible, playlistId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useAppStyles(createStyles);
  const library = useLibrary();
  const player = usePlayer();
  const [view, setView] = useState<'actions' | 'playlists'>('actions');
  const [prevVisible, setPrevVisible] = useState(visible);

  if (prevVisible !== visible) {
    setPrevVisible(visible);
    if (!visible) setView('actions');
  }

  if (!track) return null;

  const close = () => onClose();

  const startOver = () => {
    setView('actions');
    close();
  };

  const current = player.currentTrack?.id === track.id;

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.grabber} />
          <View style={styles.trackMeta}>
            <Artwork hue={track.hue} initials={trackInitials(track.artist)} size={46} radiusValue={radius.sm} iconSize={18} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[typography.bodyMd, { color: colors.onSurface, fontFamily: fonts.bodySemi }]}>
                {track.title}
              </Text>
              <Text numberOfLines={1} style={styles.trackSub}>
                {track.artist}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={close} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={colors.onSurface} />
            </Pressable>
          </View>

          {view === 'playlists' ? (
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
              <Pressable
                style={styles.actionRow}
                onPress={() => {
                  library.toggleFavorite(track.id);
                  close();
                }}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(247,81,161,0.18)' }]}>
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
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(160,120,255,0.16)' }]}>
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
  },
  trackSub: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
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
});