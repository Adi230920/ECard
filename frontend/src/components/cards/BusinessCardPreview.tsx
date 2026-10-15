import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { radii, spacing, typography } from '../../theme/tokens';
import { useAppTheme } from '../../theme/ThemeProvider';

interface BusinessCardPreviewProps { uri: string; onPress?: () => void; onError?: () => void; compact?: boolean; }

export const BusinessCardPreview = ({ uri, onPress, onError, compact = false }: BusinessCardPreviewProps) => {
  const { theme } = useAppTheme();
  const content = (
    <>
      <Image accessibilityLabel="Original business card" onError={onError} resizeMode="contain" source={{ uri }} style={[styles.image, compact && styles.compact, { backgroundColor: theme.colors.surfaceSubtle }]} />
      {onPress ? (
        <View style={styles.caption}>
          <Ionicons color={theme.colors.primary} name="expand-outline" size={17} />
          <Text style={[styles.captionText, { color: theme.colors.primary }]}>View card</Text>
        </View>
      ) : null}
    </>
  );
  return onPress ? (
    <Pressable accessibilityHint="Opens the business card full screen" accessibilityRole="imagebutton" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>{content}</Pressable>
  ) : <View>{content}</View>;
};

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 1.586, maxHeight: 300, borderRadius: radii.surface },
  compact: { maxHeight: 180 },
  caption: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: spacing.sm },
  captionText: { ...typography.secondary, fontWeight: '700', marginLeft: spacing.xs },
  pressed: { opacity: 0.8 },
});
