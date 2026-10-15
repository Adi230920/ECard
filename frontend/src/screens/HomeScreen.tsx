import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreenProps } from '../types/navigation';
import { contactRepository } from '../database/contactRepository';
import type { Contact } from '../types/contact';
import { AppButton } from '../components/ui/AppButton';
import { ContactRow } from '../components/contacts/ContactRow';
import { IconButton } from '../components/ui/IconButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { layout, radii, spacing, typography } from '../theme/tokens';

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useAppTheme();
  const horizontalPadding = width <= 360 ? spacing.lg : width >= 600 ? spacing.xxl : spacing.xl;

  useEffect(() => {
    if (!isFocused) return;
    let active = true;
    const loadRecentContacts = async () => {
      setLoading(true);
      try {
        const contacts = await contactRepository.getRecent(5);
        if (active) setRecentContacts(contacts);
      } catch (error) {
        console.error('Failed to load recent contacts:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadRecentContacts();
    return () => { active = false; };
  }, [isFocused]);

  const header = (
    <>
      <View style={styles.appHeader}>
        <View>
          <Text style={[styles.brand, { color: theme.colors.text }]}>ECard</Text>
          <Text style={[styles.brandNote, { color: theme.colors.textSecondary }]}>Your professional contact library</Text>
        </View>
        <IconButton accessibilityLabel="Open settings" icon="settings-outline" onPress={() => navigation.navigate('Settings')} />
      </View>

      <View style={[styles.scanHero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.heroTopRow}>
          <View style={[styles.cardMark, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary }]}>
            <View style={[styles.cardMarkLine, { backgroundColor: theme.colors.primary }]} />
            <View style={[styles.cardMarkLineShort, { backgroundColor: theme.colors.primary }]} />
          </View>
          <View style={[styles.privateBadge, { backgroundColor: theme.colors.surfaceSubtle }]}>
            <Ionicons color={theme.colors.textSecondary} name="lock-closed-outline" size={14} />
            <Text style={[styles.privateText, { color: theme.colors.textSecondary }]}>On-device</Text>
          </View>
        </View>
        <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Turn a card into a contact</Text>
        <Text style={[styles.heroDescription, { color: theme.colors.textSecondary }]}>Capture, review, and save business details in a few focused steps.</Text>
        <AppButton accessibilityLabel="Scan business card" icon="scan-outline" label="Scan business card" onPress={() => navigation.navigate('Scan')} style={styles.scanButton} />
      </View>

      <View style={styles.directoryRow}>
        <View style={styles.directoryCopy}>
          <Text style={[styles.directoryTitle, { color: theme.colors.text }]}>Contact directory</Text>
          <Text style={[styles.directoryNote, { color: theme.colors.textSecondary }]}>Search every saved connection</Text>
        </View>
        <AppButton compact icon="people-outline" label="Browse" onPress={() => navigation.navigate('Contacts')} variant="tonal" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recently added</Text>
        {recentContacts.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Contacts')} style={styles.viewAll}>
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View all</Text>
            <Ionicons color={theme.colors.primary} name="arrow-forward" size={16} />
          </Pressable>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={[styles.outer, { backgroundColor: theme.colors.canvas }]}>
      <FlatList
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm, paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + spacing.xxl }]}
        data={loading ? [] : recentContacts}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={header}
        ListEmptyComponent={loading ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
        ) : (
          <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons color={theme.colors.primary} name="albums-outline" size={28} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Your contact book is ready</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Scan your first business card to build a searchable directory.</Text>
          </View>
        )}
        renderItem={({ item }) => <ContactRow contact={item} onPress={() => navigation.navigate('ContactDetails', { contactId: item.id })} showDate />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outer: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  appHeader: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  brand: { ...typography.title, fontSize: 28 },
  brandNote: { ...typography.secondary, marginTop: 1 },
  scanHero: { borderWidth: 1, borderRadius: radii.large, padding: spacing.xl, marginBottom: spacing.lg },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xl },
  cardMark: { width: 58, aspectRatio: 1.586, borderWidth: 1.5, borderRadius: 8, padding: 9, justifyContent: 'center' },
  cardMarkLine: { height: 3, width: '72%', borderRadius: 2, opacity: 0.9 },
  cardMarkLineShort: { height: 3, width: '48%', borderRadius: 2, opacity: 0.45, marginTop: 6 },
  privateBadge: { minHeight: 30, paddingHorizontal: spacing.sm, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center' },
  privateText: { ...typography.label, marginLeft: spacing.xs },
  heroTitle: { ...typography.title },
  heroDescription: { ...typography.body, marginTop: spacing.sm, maxWidth: 460 },
  scanButton: { marginTop: spacing.xl },
  directoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxl, paddingHorizontal: spacing.xs },
  directoryCopy: { flex: 1, minWidth: 0, marginRight: spacing.md },
  directoryTitle: { ...typography.contact },
  directoryNote: { ...typography.secondary, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitle: { ...typography.section },
  viewAll: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md },
  viewAllText: { ...typography.secondary, fontWeight: '700', marginRight: spacing.xs },
  loader: { marginTop: spacing.xxl },
  empty: { alignItems: 'center', borderWidth: 1, borderRadius: radii.surface, padding: spacing.xxl, marginTop: spacing.sm },
  emptyTitle: { ...typography.contact, marginTop: spacing.md, textAlign: 'center' },
  emptyText: { ...typography.secondary, marginTop: spacing.xs, textAlign: 'center', maxWidth: 300 },
});
