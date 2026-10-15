import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../../theme/tokens';
import { useAppTheme } from '../../theme/ThemeProvider';

export const SectionHeader = ({ title, description }: { title: string; description?: string }) => {
  const { theme } = useAppTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {description ? <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  title: { ...typography.section },
  description: { ...typography.secondary, marginTop: spacing.xs },
});
