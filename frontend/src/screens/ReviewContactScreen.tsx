import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReviewContactScreenProps } from '../types/navigation';

export const ReviewContactScreen = ({ route, navigation }: ReviewContactScreenProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Review Contact Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, fontWeight: '600' },
});
