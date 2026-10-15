import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/ui/AppScreen';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { spacing, typography } from '../theme/tokens';
import { useAppTheme } from '../theme/ThemeProvider';

export const SettingsScreen = () => {
  const { theme } = useAppTheme();
  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>APPEARANCE</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>Choose your theme</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>Select the appearance that is most comfortable for you. Your choice stays on this device.</Text>
        <View style={styles.toggle}><ThemeToggle /></View>
      </ScrollView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl },
  eyebrow: { ...typography.label, letterSpacing: 1.1, marginTop: spacing.md },
  title: { ...typography.title, marginTop: spacing.sm },
  description: { ...typography.body, marginTop: spacing.sm, maxWidth: 500 },
  toggle: { marginTop: spacing.xxl },
});
