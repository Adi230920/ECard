import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { useAppTheme } from '../../theme/ThemeProvider';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const FormField = ({ label, error, multiline, style, onFocus, onBlur, ...props }: FormFieldProps) => {
  const { theme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: error ? theme.colors.danger : theme.colors.textSecondary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        {...props}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        style={[
          styles.input,
          multiline && styles.multiline,
          { backgroundColor: theme.colors.surface, borderColor: error ? theme.colors.danger : focused ? theme.colors.focus : theme.colors.border, color: theme.colors.text },
          style,
        ]}
      />
      {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: { ...typography.secondary, fontWeight: '600', marginBottom: spacing.sm },
  input: { minHeight: 50, borderWidth: 1, borderRadius: radii.input, paddingHorizontal: spacing.md, paddingVertical: spacing.md, ...typography.body },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  error: { ...typography.label, marginTop: spacing.xs },
});
