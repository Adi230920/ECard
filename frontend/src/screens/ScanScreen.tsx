import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScanScreenProps } from '../types/navigation';

export const ScanScreen = ({ navigation }: ScanScreenProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Scan Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, fontWeight: '600' },
});
