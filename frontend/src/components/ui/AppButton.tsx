import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { layout, radii, spacing, typography } from '../../theme/tokens';
import { useAppTheme } from '../../theme/ThemeProvider';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'danger' | 'ghost';

interface AppButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  compact?: boolean;
}

export const AppButton = ({
  label,
  variant = 'primary',
  icon,
  loading = false,
  compact = false,
  disabled,
  style,
  ...props
}: AppButtonProps) => {
  const { theme } = useAppTheme();
  const colors = theme.colors;
  const palette = {
    primary: { background: colors.primary, border: colors.primary, foreground: colors.onPrimary },
    secondary: { background: colors.surface, border: colors.border, foreground: colors.text },
    tonal: { background: colors.primarySoft, border: colors.primarySoft, foreground: colors.primary },
    danger: { background: colors.dangerSoft, border: colors.dangerSoft, foreground: colors.danger },
    ghost: { background: 'transparent', border: 'transparent', foreground: colors.primary },
  }[variant];
  const unavailable = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={unavailable}
      {...props}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && !unavailable && { opacity: 0.78 },
        unavailable && styles.disabled,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} size="small" />
      ) : (
        <>
          {icon ? <Ionicons color={palette.foreground} name={icon} size={20} style={styles.icon} /> : null}
          <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radii.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 44, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  label: { ...typography.body, fontWeight: '700', textAlign: 'center' },
  icon: { marginRight: spacing.sm },
  disabled: { opacity: 0.55 },
});
