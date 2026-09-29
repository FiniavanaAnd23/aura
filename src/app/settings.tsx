import { Slider } from '@/components/slider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Copyright } from '@/components/copyright';
import { PressableScale } from '@/components/motion';
import { SectionHeader } from '@/components/section-header';
import { colors, fonts, radius, spacing, typography } from '@/constants/theme';
import { BAND_NAMES, EQ_PRESETS, useSettings } from '@/context/settings-context';
import { useAppStyles, useTheme } from '@/context/theme-context';

function SwitchRow({ label, hint, value, onValueChange }: { label: string; hint?: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const styles = useAppStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.stroke, true: colors.primary }}
        thumbColor={colors.surfaceHigh}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const styles = useAppStyles(createStyles);
  const router = useRouter();
  const settings = useSettings();
  const theme = useTheme();

  const isSimulated = Platform.OS === 'web' ? '' : ' (lecture native uniquement)';

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} scaleTo={0.9} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </PressableScale>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl * 2 + insets.bottom }}>
        <SectionHeader title="Lecture" />

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLabelWrap}>
              <Text style={styles.rowLabel}>Volume</Text>
              <Text style={styles.rowHint}>{Math.round(settings.volume * 100)} %</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={settings.volume}
              onValueChange={(v) => settings.update({ volume: v })}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.stroke}
              thumbTintColor={colors.surfaceHigh}
            />
          </View>

          <SwitchRow
            label="Normalisation (loudness)"
            hint="Lisse le volume entre morceaux"
            value={settings.loudness}
            onValueChange={(v) => settings.update({ loudness: v })}
          />

          <SwitchRow
            label="Bass boost"
            hint="Renforce les graves"
            value={settings.bassBoost > 0}
            onValueChange={(v) => settings.update({ bassBoost: v ? 0.5 : 0 })}
          />
          {settings.bassBoost > 0 ? (
            <View style={styles.row}>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>Intensité des graves</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                step={0.1}
                value={settings.bassBoost}
                onValueChange={(v) => settings.update({ bassBoost: v })}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.stroke}
                thumbTintColor={colors.surfaceHigh}
              />
            </View>
          ) : null}

          <SwitchRow
            label="Fondu en ouverture"
            hint="Volume qui monte en douceur"
            value={settings.fadeInOut}
            onValueChange={(v) => settings.update({ fadeInOut: v })}
          />

          <SwitchRow
            label="Crossfade"
            hint={`Enchaîne les titres en fondu${isSimulated}`}
            value={settings.crossfade}
            onValueChange={(v) => settings.update({ crossfade: v })}
          />

          <SwitchRow
            label="Gapless"
            hint={`Lecture sans coupure${isSimulated}`}
            value={settings.gapless}
            onValueChange={(v) => settings.update({ gapless: v })}
          />
        </View>

        <SectionHeader title="Égaliseur" />

        <View style={styles.card}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
            {EQ_PRESETS.map((p) => {
              const active = settings.eqPreset === p.id;
              return (
                <PressableScale key={p.id} onPress={() => settings.selectPreset(p.id)} scaleTo={0.94} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          {BAND_NAMES.map((name, i) => (
            <View key={name} style={styles.bandRow}>
              <View style={styles.bandLabelWrap}>
                <Text style={styles.bandName}>{name}</Text>
                <Text style={styles.bandValue}>
                  {settings.bands[i] == null ? 0 : Math.round(settings.bands[i] * 100)}
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={-1}
                maximumValue={1}
                step={0.05}
                value={settings.bands[i] ?? 0}
                onValueChange={(v) => {
                  const bands = [...settings.bands];
                  bands[i] = v;
                  settings.update({ bands, eqPreset: 'custom' });
                }}
                minimumTrackTintColor={colors.secondary}
                maximumTrackTintColor={colors.stroke}
                thumbTintColor={colors.surfaceHigh}
              />
            </View>
          ))}

          <PressableScale onPress={settings.resetEqualizer} scaleTo={0.96} style={styles.resetBtn}>
            <MaterialIcons name="refresh" size={16} color={colors.primary} />
            <Text style={styles.resetText}>Réinitialiser</Text>
          </PressableScale>
        </View>

        <SectionHeader title="Effets" />

        <View style={styles.card}>
          <SwitchRow
            label="Virtualizer"
            hint={`Élargit la scène sonore${isSimulated}`}
            value={settings.virtualizer}
            onValueChange={(v) => settings.update({ virtualizer: v })}
          />

          <View style={styles.row}>
            <View style={styles.rowLabelWrap}>
              <Text style={styles.rowLabel}>Balance</Text>
              <Text style={styles.rowHint}>
                {settings.balance === 0 ? 'Centre' : settings.balance < 0 ? `G ${Math.round(-settings.balance * 100)}` : `D ${Math.round(settings.balance * 100)}`}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={-1}
              maximumValue={1}
              step={0.05}
              value={settings.balance}
              onValueChange={(v) => settings.update({ balance: v })}
              minimumTrackTintColor={colors.secondary}
              maximumTrackTintColor={colors.stroke}
              thumbTintColor={colors.surfaceHigh}
            />
          </View>
        </View>

        <SectionHeader title="Apparence" />

        <View style={styles.card}>
          <SwitchRow
            label="Thème sombre"
            hint="Passer en mode clair/sombre"
            value={theme.mode === 'dark'}
            onValueChange={(dark) => theme.setMode(dark ? 'dark' : 'light')}
          />
        </View>

        <View style={styles.about}>
          <Copyright />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    headerTitle: {
      color: colors.onSurface,
      fontSize: typography.headlineLg.fontSize,
      lineHeight: typography.headlineLg.lineHeight,
      letterSpacing: typography.headlineLg.letterSpacing,
      fontFamily: fonts.headline,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceHigh,
    },
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.stroke,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    rowLabelWrap: {
      flex: 1,
      gap: 2,
    },
    rowLabel: {
      color: colors.onSurface,
      fontSize: 14,
      fontFamily: fonts.bodySemi,
    },
    rowHint: {
      color: colors.onSurfaceVariant,
      fontSize: 12,
      fontFamily: fonts.body,
    },
    slider: {
      width: '48%',
      height: 32,
    },
    chipScroll: {
      marginHorizontal: -spacing.md,
    },
    chips: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    chip: {
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.stroke,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.onSurfaceVariant,
      fontSize: 13,
      fontFamily: fonts.bodySemi,
    },
    chipTextActive: {
      color: colors.onPrimary,
    },
    bandRow: {
      gap: 4,
      paddingVertical: spacing.xs,
    },
    bandLabelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    bandName: {
      color: colors.onSurfaceVariant,
      fontSize: 12,
      fontFamily: fonts.body,
    },
    bandValue: {
      color: colors.onSurface,
      fontSize: 12,
      fontFamily: fonts.bodySemi,
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      marginTop: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: compact(colors.primary, 0.12),
    },
    resetText: {
      color: colors.primary,
      fontSize: 13,
      fontFamily: fonts.bodySemi,
    },
    about: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
  });

function compact(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}