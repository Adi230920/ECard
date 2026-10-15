import React from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { layout, radii } from '../../theme/tokens';
import { useAppTheme } from '../../theme/ThemeProvider';

interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone?: 'default' | 'primary' | 'danger' | 'inverse';
  size?: number;
}

export const IconButton = ({ icon, tone = 'default', size = 22, disabled, style, ...props }: IconButtonProps) => {
  const { theme } = useAppTheme();
  const foreground = tone === 'primary' ? theme.colors.primary : tone === 'danger' ? theme.colors.danger : tone === 'inverse' ? theme.colors.white : theme.colors.textSecondary;
  const background = tone === 'primary' ? theme.colors.primarySoft : tone === 'danger' ? theme.colors.dangerSoft : tone === 'inverse' ? 'rgba(0,0,0,0.48)' : theme.colors.surfaceSubtle;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...props}
      style={({ pressed }) => [styles.button, { backgroundColor: background }, pressed && { opacity: 0.72 }, disabled && { opacity: 0.5 }, typeof style === 'function' ? style({ pressed }) : style]}
    >
      <Ionicons color={foreground} name={icon} size={size} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: { width: layout.minTouchTarget, height: layout.minTouchTarget, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
