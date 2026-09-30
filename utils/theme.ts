/**
 * Design tokens.
 *
 * Rules that keep the app simple and readable:
 *  - Two brand colours only (violet + saffron) plus neutrals.
 *  - Body text is never smaller than 18pt, Sanskrit is 30pt.
 *  - Lots of space, soft corners, high contrast in both light and dark mode.
 */

export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  /** Screen background. */
  bg: string;
  /** Cards and inputs. */
  surface: string;
  /** Slightly stronger neutral, e.g. the camera frame background. */
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  scrim: string;
};

export const lightTheme: AppTheme = {
  mode: 'light',
  bg: '#FFFFFF',
  surface: '#F7F4FD',
  surfaceAlt: '#EFEAFA',
  text: '#191233',
  textMuted: '#6A6284',
  border: '#E3DCF3',
  primary: '#5B21B6',
  onPrimary: '#FFFFFF',
  primarySoft: '#ECE5FB',
  accent: '#B45309',
  accentSoft: '#FDF1DE',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  scrim: 'rgba(25, 18, 51, 0.45)',
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  bg: '#100E1A',
  surface: '#1A1727',
  surfaceAlt: '#231F35',
  text: '#F5F3FB',
  textMuted: '#A79FC4',
  border: '#2E2A42',
  primary: '#A78BFA',
  onPrimary: '#180C33',
  primarySoft: '#251D44',
  accent: '#FCD34D',
  accentSoft: '#3A2E12',
  danger: '#FDA29B',
  dangerSoft: '#3B1A17',
  scrim: 'rgba(0, 0, 0, 0.62)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const fontSize = {
  meta: 14,
  helper: 16,
  body: 18,
  input: 19,
  button: 20,
  title: 28,
  sanskrit: 30,
};