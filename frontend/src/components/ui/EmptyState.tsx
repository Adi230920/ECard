import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppButton } from './AppButton';
import { radii, spacing, typography } from '../../theme/tokens';
import { useAppTheme } from '../../theme/ThemeProvider';

interface EmptyStateProps { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; message: string; actionLabel?: string; onAction?: () => void; }

export const EmptyState = ({ icon, title, message, actionLabel, onAction }: EmptyStateProps) => {
  const { theme } = useAppTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft }]}><Ionicons color={theme.colors.primary} name={icon} size={28} /></View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction ? <AppButton compact label={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  icon: { width: 64, height: 64, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { ...typography.section, textAlign: 'center' },
  message: { ...typography.secondary, textAlign: 'center', marginTop: spacing.sm, maxWidth: 320 },
  action: { marginTop: spacing.xl },
});
