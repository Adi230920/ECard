import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { loadThemePreference, saveThemePreference } from './themeStorage';
import { themes, type AppTheme, type ThemeName } from './tokens';

interface ThemeContextValue {
  theme: AppTheme;
  themeName: ThemeName;
  ready: boolean;
  setThemeName: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: React.PropsWithChildren) => {
  const [themeName, setThemeState] = useState<ThemeName>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadThemePreference()
      .then((savedTheme) => {
        if (active) setThemeState(savedTheme);
      })
      .catch((error) => console.warn('Unable to restore theme preference', error))
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const theme = themes[themeName];

  useEffect(() => {
    Appearance.setColorScheme(themeName);
    void SystemUI.setBackgroundColorAsync(theme.colors.canvas);
  }, [theme.colors.canvas, themeName]);

  const setThemeName = useCallback((nextTheme: ThemeName) => {
    setThemeState(nextTheme);
    void saveThemePreference(nextTheme).catch((error) =>
      console.warn('Unable to save theme preference', error)
    );
  }, []);

  const value = useMemo(
    () => ({ theme, themeName, ready, setThemeName }),
    [ready, setThemeName, theme, themeName]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = (): ThemeContextValue => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useAppTheme must be used within ThemeProvider');
  return value;
};
