import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { HomeScreen } from '../screens/HomeScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ReviewContactScreen } from '../screens/ReviewContactScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { ContactDetailScreen } from '../screens/ContactDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useAppTheme } from '../theme/ThemeProvider';
import { createNavigationTheme } from '../theme/navigationTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { theme } = useAppTheme();
  return (
    <NavigationContainer theme={createNavigationTheme(theme)}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.canvas },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Scan" 
          component={ScanScreen} 
          options={{ title: 'Scan Card' }}
        />
        <Stack.Screen 
          name="ReviewContact" 
          component={ReviewContactScreen} 
          options={({ route }) => ({
            title: route.params?.contactId !== undefined ? 'Edit Contact' : 'Review Contact',
          })}
        />
        <Stack.Screen 
          name="Contacts" 
          component={ContactsScreen} 
          options={{ title: 'My Contacts' }}
        />
        <Stack.Screen 
          name="ContactDetails" 
          component={ContactDetailScreen} 
          options={{ title: 'Contact Details' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
