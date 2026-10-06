import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { HomeScreen } from '../screens/HomeScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ReviewContactScreen } from '../screens/ReviewContactScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { ContactDetailScreen } from '../screens/ContactDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
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
          options={{ title: 'Review Contact' }}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};
