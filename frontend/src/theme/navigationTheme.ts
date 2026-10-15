import type { Theme } from '@react-navigation/native';
import type { AppTheme } from './tokens';

export const createNavigationTheme = (theme: AppTheme): Theme => ({
  dark: theme.dark,
  colors: {
    primary: theme.colors.primary,
    background: theme.colors.canvas,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.danger,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '600' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
});
