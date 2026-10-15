import React, { useEffect, useState } from 'react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/database/database';
import { ActivityIndicator, StyleSheet, Text, View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeProvider';
import { AppButton } from './src/components/ui/AppButton';
import { spacing, typography } from './src/theme/tokens';

const AppContent = () => {
  const { ready, theme } = useAppTheme();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [databaseAttempt, setDatabaseAttempt] = useState(0);

  useEffect(() => {
    async function setup() {
      if (Platform.OS === 'web') {
        setDbReady(true);
        return;
      }
      try {
        setDbError(false);
        await initDatabase();
        setDbReady(true);
      } catch (e) {
        console.error('Failed to initialize database', e);
        setDbError(true);
      }
    }
    setup();
  }, [databaseAttempt]);

  if (!dbReady || !ready) {
    if (dbError && ready) {
      return (
        <View style={[styles.databaseState, { backgroundColor: theme.colors.canvas }]}>
          <Text style={[styles.databaseTitle, { color: theme.colors.text }]}>Unable to open ECard</Text>
          <Text style={[styles.databaseMessage, { color: theme.colors.textSecondary }]}>
            Your saved contacts were not changed. Please try opening the local database again.
          </Text>
          <AppButton label="Try again" onPress={() => setDatabaseAttempt((value) => value + 1)} />
        </View>
      );
    }

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.canvas }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <AppNavigator />
      <StatusBar animated style={theme.dark ? 'light' : 'dark'} />
    </>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  databaseState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  databaseTitle: { ...typography.title, textAlign: 'center' },
  databaseMessage: {
    ...typography.body,
    maxWidth: 420,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
});
