import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Artwork } from '@/components/artwork';
import { PrimaryButton } from '@/components/primary-button';
import { TrackMenu } from '@/components/track-menu';
import { TrackRow } from '@/components/track-row';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { useLibrary } from '@/context/library-context';
import { usePlayer } from '@/context/player-context';
import { useAppStyles } from '@/context/theme-context';
import { artworkInitials, hashHue, titleCount, trackInitials } from '@/lib/utils';
import type { Track } from '@/lib/types';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const library = useLibrary();
  const player = usePlayer();
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const playlist = library.playlists.find((p) => p.id === id);
  const tracks = useMemo(
    () =>
      playlist?.trackIds
        .map((tid) => library.tracks.find((t) => t.id === tid))
        .filter((t): t is Track => Boolean(t)) ?? [],
    [playlist, library.tracks]
  );

  const available = useMemo(
    () => library.tracks.filter((t) => !playlist?.trackIds.includes(t.id)),
    [library.tracks, playlist]
  );

  if (!playlist) {
    return (
      <View style={styles.root}>
        <View style={styles.backRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
        <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 60 }]}>
          Cette playlist a été supprimée.
        </Text>
      </View>
    );
  }

  const toggleSelect = (tid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tid)) next.delete(tid);
      else next.add(tid);
      return next;
    });
  };

  const confirmAdd = () => {
    if (!selected.size) return;
    library.addToPlaylist(playlist.id, [...selected]);
    setSelected(new Set());
    setAdding(false);
  };

  const openRename = () => {
    setDraftName(playlist.name);
    setDraftDesc(playlist.description ?? '');
    setRenaming(true);
  };

  const confirmRename = () => {
    const name = draftName.trim();
    if (!name) {
      Alert.alert('Nom requis', 'La playlist doit avoir un nom.');
      return;
    }
    library.renamePlaylist(playlist.id, name, draftDesc.trim());
    setRenaming(false);
  };

  const confirmDelete = () => {
    Alert.alert('Supprimer cette playlist ?', `« ${playlist.name} » sera définitivement supprimée.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { router.back(); library.deletePlaylist(playlist.id); } },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={{ height: insets.top + 10 }} />
        <View style={styles.backRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
          <View style={styles.backActions}>
            <Pressable style={styles.backBtn} onPress={openRename} hitSlop={10} accessibilityLabel="Renommer la playlist">
              <MaterialIcons name="edit" size={19} color={colors.onSurfaceVariant} />
            </Pressable>
            <Pressable style={styles.backBtn} onPress={confirmDelete} hitSlop={10} accessibilityLabel="Supprimer la playlist">
              <MaterialIcons name="delete-outline" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Artwork hue={hashHue(playlist.name)} initials={trackInitials(playlist.name)} size={132} radiusValue={radius.lg} iconSize={40} />
          <Text
            style={[typography.headlineLgMobile, styles.heroTitle]}
            onPress={openRename}
            onLongPress={openRename}
            suppressHighlighting>
            {playlist.name}
          </Text>
          {playlist.description ? <Text style={styles.heroDesc}>{playlist.description}</Text> : null}
          <View style={styles.heroMeta}>
            <MaterialIcons name="offline-pin" size={14} color={colors.secondary} />
            <Text style={styles.heroCount}>{titleCount(tracks.length)} • Hors-ligne</Text>
          </View>

          <View style={styles.playRow}>
            <PrimaryButton
              small
              label={tracks.length ? 'Tout lire' : 'Ajouter des titres'}
              icon={tracks.length ? 'play-arrow' : 'add'}
              onPress={() => {
                if (tracks.length) {
                  player.playQueue(tracks.map((t) => t.id));
                  router.push('/player');
                } else {
                  setAdding(true);
                }
              }}
              disabled={!tracks.length && !available.length}
            />
            {tracks.length ? (
              <Pressable
                style={styles.ghostBtn}
                onPress={() => {
                  const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                  player.playQueue(shuffled.map((t) => t.id));
                  router.push('/player');
                }}>
                <MaterialIcons name="shuffle" size={20} color={colors.onSurface} />
              </Pressable>
            ) : null}
            <Pressable style={styles.ghostBtn} onPress={() => setAdding(true)} disabled={!available.length}>
              <MaterialIcons name="playlist-add" size={20} color={available.length ? colors.secondary : colors.outline} />
            </Pressable>
          </View>
        </View>

        <View style={styles.list}>
          {tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              isCurrent={player.currentTrack?.id === track.id}
              isPlaying={player.isPlaying}
              onPress={() => {
                player.playQueue(tracks.map((t) => t.id), track.id);
                router.push('/player');
              }}
              onFavorite={() => library.toggleFavorite(track.id)}
              onMore={() => setMenuTrack(track)}
            />
          ))}
        </View>
      </ScrollView>

      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>Ajouter à la playlist</Text>
                <Text style={[typography.headlineSm, { color: colors.onSurface, fontFamily: fonts.headlineSemi }]}>
                  {available.length} titres disponibles
                </Text>
              </View>
              <Pressable style={styles.sheetClose} onPress={() => setAdding(false)} hitSlop={8}>
                <MaterialIcons name="close" size={20} color={colors.onSurface} />
              </Pressable>
            </View>

            <FlatList
              data={available}
              keyExtractor={(t) => t.id}
              style={styles.sheetList}
              renderItem={({ item }) => (
                <Pressable style={styles.pickRow} onPress={() => toggleSelect(item.id)}>
                  <Artwork hue={item.hue} initials={artworkInitials(item)} size={40} radiusValue={radius.sm} iconSize={16} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[typography.bodyMd, { color: colors.onSurface }]}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.pickSub}>
                      {item.artist}
                    </Text>
                  </View>
                  <MaterialIcons
                    name={selected.has(item.id) ? 'check-circle' : 'radio-button-unchecked'}
                    size={22}
                    color={selected.has(item.id) ? colors.primary : colors.outline}
                  />
                </Pressable>
              )}
            />

            <View style={styles.sheetActions}>
              <PrimaryButton
                label={`Ajouter ${selected.size ? `(${selected.size})` : ''}`}
                icon="check"
                onPress={confirmAdd}
                disabled={!selected.size}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={renaming} transparent animationType="slide" onRequestClose={() => setRenaming(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>Modifier</Text>
                <Text style={[typography.headlineSm, { color: colors.onSurface, fontFamily: fonts.headlineSemi }]}>
                  Renommer la playlist
                </Text>
              </View>
              <Pressable style={styles.sheetClose} onPress={() => setRenaming(false)} hitSlop={8}>
                <MaterialIcons name="close" size={20} color={colors.onSurface} />
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nom</Text>
              <TextInput
                style={styles.input}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Nom de la playlist"
                placeholderTextColor={colors.outline}
                selectionColor={colors.primary}
                maxLength={60}
                autoFocus
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Description (facultatif)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={draftDesc}
                onChangeText={setDraftDesc}
                placeholder="Ambiance, moment, style..."
                placeholderTextColor={colors.outline}
                selectionColor={colors.primary}
                maxLength={140}
                multiline
              />
            </View>

            <View style={styles.sheetActions}>
              <PrimaryButton label="Enregistrer" icon="check" onPress={confirmRename} disabled={!draftName.trim()} />
            </View>
          </View>
        </View>
      </Modal>
      <TrackMenu
        track={menuTrack}
        visible={Boolean(menuTrack)}
        playlistId={playlist.id}
        onClose={() => setMenuTrack(null)}
      />
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  backRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,22,30,0.7)',
  },
  backActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  field: {
    gap: 6,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: fonts.bodySemi,
  },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  heroTitle: {
    color: colors.onSurface,
    fontFamily: fonts.headline,
    textAlign: 'center',
  },
  heroDesc: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    textAlign: 'center',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCount: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ghostBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.surfaceLow,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    maxHeight: '75%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetEyebrow: {
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: fonts.bodySemi,
    marginBottom: 2,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  sheetList: {
    flexGrow: 0,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pickSub: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  sheetActions: {
    paddingTop: spacing.md,
  },
});