import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { radii, spacing, typography, type ThemeName } from '../../theme/tokens';
import { useAppTheme } from '../../theme/ThemeProvider';

export const ThemeToggle = () => {
  const { theme, themeName, setThemeName } = useAppTheme();
  const options: { value: ThemeName; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  ];
  return (
    <View accessibilityRole="radiogroup" style={[styles.group, { backgroundColor: theme.colors.surfaceSubtle }]}>
      {options.map((option) => {
        const selected = themeName === option.value;
        return (
          <Pressable
            accessibilityLabel={`${option.label} theme`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={option.value}
            onPress={() => setThemeName(option.value)}
            style={({ pressed }) => [styles.option, selected && { backgroundColor: theme.colors.surface }, pressed && { opacity: 0.75 }]}
          >
            <Ionicons color={selected ? theme.colors.primary : theme.colors.textSecondary} name={option.icon} size={20} />
            <Text style={[styles.label, { color: selected ? theme.colors.text : theme.colors.textSecondary }]}>{option.label}</Text>
            {selected ? <Ionicons color={theme.colors.primary} name="checkmark-circle" size={20} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  group: { padding: spacing.xs, borderRadius: radii.surface },
  option: { minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radii.control, flexDirection: 'row', alignItems: 'center' },
  label: { ...typography.body, fontWeight: '600', flex: 1, marginLeft: spacing.md },
});
