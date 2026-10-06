import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ContactDetailsScreenProps } from '../types/navigation';

export const ContactDetailScreen = ({ route, navigation }: ContactDetailsScreenProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Contact Detail Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, fontWeight: '600' },
});
