import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Scan: undefined;
  ReviewContact: { imagePath?: string; contactId?: number };
  Contacts: undefined;
  ContactDetails: { contactId: number };
  Settings: undefined;
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type ScanScreenProps = NativeStackScreenProps<RootStackParamList, 'Scan'>;
export type ReviewContactScreenProps = NativeStackScreenProps<RootStackParamList, 'ReviewContact'>;
export type ContactsScreenProps = NativeStackScreenProps<RootStackParamList, 'Contacts'>;
export type ContactDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'ContactDetails'>;
export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;
