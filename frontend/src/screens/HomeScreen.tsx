import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { HomeScreenProps } from '../types/navigation';
import { contactRepository } from '../database/contactRepository';
import { Contact } from '../types/contact';
import { useIsFocused } from '@react-navigation/native';

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadRecentContacts();
    }
  }, [isFocused]);

  const loadRecentContacts = async () => {
    try {
      const contacts = await contactRepository.getRecent(5);
      setRecentContacts(contacts);
    } catch (error) {
      console.error('Failed to load recent contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanCard = () => {
    navigation.navigate('Scan');
  };

  const handleContactPress = (contactId: number) => {
    navigation.navigate('ContactDetails', { contactId });
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => handleContactPress(item.id)}
    >
      <Text style={styles.contactName}>{item.name || 'Unknown Name'}</Text>
      {item.company ? (
        <Text style={styles.contactCompany}>{item.company}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ECard</Text>
      </View>

      <TouchableOpacity style={styles.scanButton} onPress={handleScanCard}>
        <Text style={styles.scanButtonText}>Scan Card</Text>
      </TouchableOpacity>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Contacts</Text>
        
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
        ) : recentContacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No contacts saved yet.</Text>
            <Text style={styles.emptyStateSubtext}>Scan a business card to get started.</Text>
          </View>
        ) : (
          <FlatList
            data={recentContacts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderContactItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#212529',
  },
  scanButton: {
    margin: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  recentSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 16,
  },
  loader: {
    marginTop: 24,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#868E96',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 24,
  },
  contactItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  contactCompany: {
    fontSize: 14,
    color: '#868E96',
  },
});
