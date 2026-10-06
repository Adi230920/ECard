import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ContactsScreenProps } from '../types/navigation';

export const ContactsScreen = ({ navigation }: ContactsScreenProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Contacts Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, fontWeight: '600' },
});
