import Storage from 'expo-sqlite/kv-store';
import { parseThemeName, type ThemeName } from './tokens';

const THEME_KEY = 'ecard.theme';

export const loadThemePreference = async (): Promise<ThemeName> => {
  const storedTheme = await Storage.getItem(THEME_KEY);
  return parseThemeName(storedTheme);
};

export const saveThemePreference = async (theme: ThemeName): Promise<void> => {
  await Storage.setItem(THEME_KEY, theme);
};
