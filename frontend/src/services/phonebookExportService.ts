import { Platform } from 'react-native';
import {
  Contact as ExpoContact,
  ContactField,
  getPermissionsAsync,
  requestPermissionsAsync,
  type CreateContactRecord,
} from 'expo-contacts';
import type {
  AccessiblePhonebookContact,
  PhonebookCreateRecord,
  PhonebookExportApi,
  PhonebookPermissionResponse,
} from '../utils/phonebookExport';

const ensureNativeContactsAvailable = () => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    throw new Error('Device contacts are only available on Android and iOS.');
  }
};

const mapPermission = (
  permission: Awaited<ReturnType<typeof getPermissionsAsync>>
): PhonebookPermissionResponse => ({
  status: permission.status,
  granted: permission.granted,
  canAskAgain: permission.canAskAgain,
  accessPrivileges: permission.accessPrivileges,
});

export const phonebookExportApi: PhonebookExportApi = {
  async getPermission() {
    ensureNativeContactsAvailable();
    return mapPermission(await getPermissionsAsync());
  },

  async requestPermission() {
    ensureNativeContactsAvailable();
    return mapPermission(await requestPermissionsAsync());
  },

  async getContactPage(limit, offset): Promise<AccessiblePhonebookContact[]> {
    ensureNativeContactsAvailable();
    const contacts = await ExpoContact.getAllDetails(
      [ContactField.PHONES, ContactField.EMAILS] as const,
      { limit, offset }
    );

    return contacts.map((contact) => ({
      id: contact.id,
      phones: contact.phones,
      emails: contact.emails,
    }));
  },

  async createContact(record: PhonebookCreateRecord) {
    ensureNativeContactsAvailable();
    await ExpoContact.create(record as CreateContactRecord);
  },
};
