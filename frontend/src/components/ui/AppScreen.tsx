import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '../../theme/tokens';
import { useAppTheme } from '../../theme/ThemeProvider';

interface AppScreenProps extends ViewProps {
  includeTopInset?: boolean;
  includeBottomInset?: boolean;
}

export const AppScreen = ({
  children,
  includeTopInset = false,
  includeBottomInset = false,
  style,
  ...props
}: AppScreenProps) => {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      {...props}
      style={[
        styles.screen,
        { backgroundColor: theme.colors.canvas },
        includeTopInset && { paddingTop: insets.top },
        includeBottomInset && { paddingBottom: insets.bottom },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
});
