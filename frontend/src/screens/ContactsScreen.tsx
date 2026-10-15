import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { ContactsScreenProps } from '../types/navigation';
import { contactRepository } from '../database/contactRepository';
import type { Contact } from '../types/contact';
import { ContactRow } from '../components/contacts/ContactRow';
import { EmptyState } from '../components/ui/EmptyState';
import { AppButton } from '../components/ui/AppButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { layout, radii, spacing, typography } from '../theme/tokens';

export const ContactsScreen = ({ navigation }: ContactsScreenProps) => {
  const isFocused = useIsFocused();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { width } = useWindowDimensions();
  const { theme } = useAppTheme();
  const horizontalPadding = width <= 360 ? spacing.lg : width >= 600 ? spacing.xxl : spacing.xl;

  useEffect(() => {
    if (!isFocused) return;
    let active = true;
    const trimmedQuery = query.trim();
    const loadContacts = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = trimmedQuery ? await contactRepository.search(trimmedQuery) : await contactRepository.getAll();
        if (active) setContacts(results);
      } catch (loadError) {
        console.error('Failed to load contacts:', loadError);
        if (active) { setContacts([]); setError('Contacts could not be loaded. Please try again.'); }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadContacts();
    return () => { active = false; };
  }, [isFocused, query, reloadToken]);

  const hasQuery = query.trim().length > 0;
  return (
    <View style={[styles.outer, { backgroundColor: theme.colors.canvas }]}>
      <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.search, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons color={theme.colors.textMuted} name="search" size={20} />
          <TextInput
            accessibilityLabel="Search contacts"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search by name or company"
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="search"
            selectionColor={theme.colors.primary}
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={query}
          />
          {query ? (
            <Pressable accessibilityLabel="Clear contact search" accessibilityRole="button" hitSlop={8} onPress={() => setQuery('')} style={styles.clear}>
              <Ionicons color={theme.colors.textSecondary} name="close-circle" size={20} />
            </Pressable>
          ) : null}
        </View>
        {!loading && !error && contacts.length > 0 ? <Text style={[styles.count, { color: theme.colors.textMuted }]}>{contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}</Text> : null}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.colors.primary} size="large" /><Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>Loading contacts…</Text></View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={[styles.stateTitle, { color: theme.colors.text }]}>Unable to load contacts</Text>
          <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>{error}</Text>
          <AppButton compact label="Try again" onPress={() => setReloadToken((value) => value + 1)} style={styles.retry} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, { paddingHorizontal: horizontalPadding }, contacts.length === 0 && styles.emptyList]}
          data={contacts}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<EmptyState actionLabel={hasQuery ? undefined : 'Scan a card'} icon={hasQuery ? 'search-outline' : 'people-outline'} message={hasQuery ? 'Try another name, company, or designation.' : 'Scan a business card to start your searchable directory.'} onAction={hasQuery ? undefined : () => navigation.navigate('Scan')} title={hasQuery ? 'No matching contacts' : 'No contacts yet'} />}
          renderItem={({ item }) => <ContactRow contact={item} onPress={() => navigation.navigate('ContactDetails', { contactId: item.id })} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outer: { flex: 1 },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  search: { minHeight: 52, flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, borderWidth: 1, borderRadius: radii.control, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, minWidth: 0, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, ...typography.body },
  clear: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  count: { ...typography.label, marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.6 },
  list: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: spacing.xxl },
  emptyList: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  stateTitle: { ...typography.section, textAlign: 'center' },
  stateText: { ...typography.secondary, marginTop: spacing.sm, textAlign: 'center' },
  retry: { marginTop: spacing.xl },
});
