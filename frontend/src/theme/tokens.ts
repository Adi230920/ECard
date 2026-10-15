export type ThemeName = 'light' | 'dark';

export interface ThemeColors {
  canvas: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  focus: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  overlay: string;
  camera: string;
  white: string;
}

const lightColors: ThemeColors = {
  canvas: '#F4F6F3',
  surface: '#FFFFFF',
  surfaceElevated: '#F9FBF9',
  surfaceSubtle: '#EAEFEB',
  primary: '#146C60',
  primaryPressed: '#0E574D',
  primarySoft: '#DCEFEB',
  onPrimary: '#FFFFFF',
  text: '#16211F',
  textSecondary: '#50605C',
  textMuted: '#687671',
  border: '#D5DEDA',
  focus: '#0E8071',
  accent: '#A96F28',
  accentSoft: '#F7EBD8',
  danger: '#B4232C',
  dangerSoft: '#FCE8E9',
  success: '#257A52',
  overlay: 'rgba(8, 11, 10, 0.72)',
  camera: '#080B0A',
  white: '#FFFFFF',
};

const darkColors: ThemeColors = {
  canvas: '#0F1715',
  surface: '#16201D',
  surfaceElevated: '#1C2925',
  surfaceSubtle: '#22312D',
  primary: '#65D1BC',
  primaryPressed: '#83DDCC',
  primarySoft: '#173B35',
  onPrimary: '#082E28',
  text: '#EFF5F2',
  textSecondary: '#B4C1BC',
  textMuted: '#8E9D97',
  border: '#31413C',
  focus: '#7CDFCD',
  accent: '#E0AE62',
  accentSoft: '#392E1F',
  danger: '#FF8B92',
  dangerSoft: '#3B2023',
  success: '#67D39B',
  overlay: 'rgba(3, 6, 5, 0.78)',
  camera: '#080B0A',
  white: '#FFFFFF',
};

export const themes = {
  light: { name: 'light' as const, dark: false, colors: lightColors },
  dark: { name: 'dark' as const, dark: true, colors: darkColors },
};

export type AppTheme = (typeof themes)[ThemeName];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  input: 10,
  control: 12,
  surface: 16,
  large: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  section: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  contact: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  secondary: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
} as const;

export const layout = {
  minTouchTarget: 48,
  contentMaxWidth: 680,
} as const;

export const parseThemeName = (value: string | null | undefined): ThemeName =>
  value === 'dark' ? 'dark' : 'light';
