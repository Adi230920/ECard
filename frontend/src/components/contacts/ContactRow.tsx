import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Contact } from '../../types/contact';
import { radii, spacing, typography } from '../../theme/tokens';
import { useAppTheme } from '../../theme/ThemeProvider';

const getInitials = (name: string | null): string => {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
};

export const ContactRow = ({ contact, onPress, showDate = false }: { contact: Contact; onPress: () => void; showDate?: boolean }) => {
  const { theme } = useAppTheme();
  const displayName = contact.name?.trim() || 'Unnamed contact';
  const supporting = contact.company?.trim() || contact.designation?.trim() || contact.emails[0] || contact.phones[0];
  const dateLabel = showDate ? new Date(contact.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : undefined;
  return (
    <Pressable
      accessibilityLabel={`${displayName}${supporting ? `, ${supporting}` : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.colors.border }, pressed && { backgroundColor: theme.colors.surfaceSubtle }]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.colors.primarySoft }]}>
        <Text style={[styles.initials, { color: theme.colors.primary }]}>{getInitials(contact.name)}</Text>
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.name, { color: theme.colors.text }]}>{displayName}</Text>
        {supporting ? <Text numberOfLines={1} style={[styles.supporting, { color: theme.colors.textSecondary }]}>{supporting}</Text> : null}
      </View>
      {dateLabel ? <Text style={[styles.date, { color: theme.colors.textMuted }]}>{dateLabel}</Text> : null}
      <Ionicons color={theme.colors.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  avatar: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  initials: { ...typography.secondary, fontWeight: '700' },
  content: { flex: 1, minWidth: 0, marginRight: spacing.sm },
  name: { ...typography.contact },
  supporting: { ...typography.secondary, marginTop: 2 },
  date: { ...typography.label, marginRight: spacing.sm },
});
