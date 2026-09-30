/**
 * App theme, driven by the phone's light/dark setting.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type AppTheme } from '@/utils/theme';

const ThemeContext = createContext<AppTheme>(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(
    () => (scheme === 'dark' ? darkTheme : lightTheme),
    [scheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}