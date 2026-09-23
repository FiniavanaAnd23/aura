/**
 * Aura Vibe — design tokens issus de base/aura_vibe/DESIGN.md
 * Thèmes « dark obsidienne » et « light » (Material 3).
 */

export type ThemeMode = 'dark' | 'light';

export type ThemePalette = {
  canvas: string;
  background: string;
  surfaceLow: string;
  surface: string;
  surfaceHigh: string;
  surfaceHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  gradientStart: string;
  gradientEnd: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  favorite: string;
  electricViolet: string;
  neonCyan: string;
  neonMagenta: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  glass: string;
  glassLight: string;
  stroke: string;
  strokeStrong: string;
  strokeActive: string;
  error: string;
  onError: string;
  errorContainer: string;
  overlay: string;
  white: string;
};

export type PaletteKey = (typeof darkPalette)[keyof typeof darkPalette];

const darkPalette: ThemePalette = {
  // Canvass & surfaces
  canvas: '#0B0C10',
  background: '#11131B',
  surfaceLow: '#191B23',
  surface: '#1D1F28',
  surfaceHigh: '#282A32',
  surfaceHighest: '#33343D',
  onSurface: '#E1E1ED',
  onSurfaceVariant: '#CBC3D7',
  outline: '#958EA0',
  outlineVariant: '#494454',

  // Accents
  primary: '#D0BCFF',
  onPrimary: '#3C0091',
  primaryContainer: '#A078FF',
  onPrimaryContainer: '#340080',
  gradientStart: '#A078FF',
  gradientEnd: '#8B5CF6',
  secondary: '#4CD7F6',
  onSecondary: '#003640',
  secondaryContainer: '#03B5D3',
  onSecondaryContainer: '#00424E',
  tertiary: '#FFB0CD',
  tertiaryContainer: '#F751A1',
  favorite: '#EC4899',

  // Brand "Énergie électrique"
  electricViolet: '#8B5CF6',
  neonCyan: '#06B6D4',
  neonMagenta: '#EC4899',

  // Texte
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#475569',

  // Verre & bordures
  glass: 'rgba(27, 30, 43, 0.82)',
  glassLight: 'rgba(27, 30, 43, 0.60)',
  stroke: 'rgba(255, 255, 255, 0.08)',
  strokeStrong: 'rgba(255, 255, 255, 0.14)',
  strokeActive: 'rgba(139, 92, 246, 0.40)',

  // États
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  overlay: 'rgba(0, 0, 0, 0.55)',
  white: '#FFFFFF',
};

const lightPalette: ThemePalette = {
  canvas: '#FCF8FF',
  background: '#F7F2FB',
  surfaceLow: '#EFE9F5',
  surface: '#F3EEF9',
  surfaceHigh: '#FFFFFF',
  surfaceHighest: '#E9E2F0',
  onSurface: '#1D1B20',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  outlineVariant: '#CAC4D0',

  // Accents
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',
  gradientStart: '#8B5CF6',
  gradientEnd: '#7C3AED',
  secondary: '#00718B',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#00A6C8',
  onSecondaryContainer: '#00151D',
  tertiary: '#C2185B',
  tertiaryContainer: '#FF639C',
  favorite: '#D81B60',

  // Brand "Énergie électrique"
  electricViolet: '#7C3AED',
  neonCyan: '#0092AE',
  neonMagenta: '#D81B60',

  // Texte
  textPrimary: '#241E2F',
  textSecondary: '#655F6E',
  textMuted: '#8A8494',

  // Verre & bordures
  glass: 'rgba(255, 255, 255, 0.78)',
  glassLight: 'rgba(250, 248, 255, 0.62)',
  stroke: 'rgba(20, 18, 40, 0.08)',
  strokeStrong: 'rgba(20, 18, 40, 0.14)',
  strokeActive: 'rgba(124, 58, 237, 0.30)',

  // États
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  overlay: 'rgba(30, 20, 60, 0.42)',
  white: '#FFFFFF',
};

let activePalette: ThemePalette = darkPalette;

export function setThemePalette(mode: ThemeMode) {
  activePalette = mode === 'light' ? lightPalette : darkPalette;
}

export function getThemeMode(): ThemeMode {
  return activePalette === lightPalette ? 'light' : 'dark';
}

/**
 * Proxy à valeurs vivantes : chaque accès lit la palette active.
 * Les composants doivent lire `colors.*` pendant le rendu (voir useAppStyles).
 */
export function createLiveColors(): ThemePalette {
  const live = {} as ThemePalette;
  for (const key of Object.keys(darkPalette) as (keyof ThemePalette)[]) {
    Object.defineProperty(live, key, {
      get: () => activePalette[key],
      enumerable: true,
    });
  }
  return live;
}

export const colors = createLiveColors();

export const fonts = {
  display: 'PlusJakartaSans_800ExtraBold',
  headline: 'PlusJakartaSans_700Bold',
  headlineSemi: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
} as const;

export const typography = {
  displayLg: { fontSize: 40, lineHeight: 48, letterSpacing: -1.2, fontWeight: '800' as const },
  headlineLg: { fontSize: 32, lineHeight: 40, letterSpacing: -0.8, fontWeight: '700' as const },
  headlineLgMobile: { fontSize: 26, lineHeight: 34, letterSpacing: -0.5, fontWeight: '700' as const },
  headlineMd: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3, fontWeight: '600' as const },
  headlineSm: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodySm: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  labelLg: { fontSize: 14, lineHeight: 20, letterSpacing: 0.14, fontWeight: '600' as const },
  labelMd: { fontSize: 12, lineHeight: 16, letterSpacing: 0.24, fontWeight: '600' as const },
  labelSm: { fontSize: 10, lineHeight: 12, letterSpacing: 0.6, fontWeight: '600' as const },
} as const;

export const spacing = {
  margin: 20,
  gutter: 16,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

export const shadows = {
  glass: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 8,
  },
  glowPrimary: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  glowCyan: {
    shadowColor: '#4CD7F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;