import type { Contact } from '../types/contact';
import { normalizeEmailForComparison, normalizePhoneForComparison } from './contactSaving.ts';
import {
  createEmailUrl,
  createLinkedInUrl,
  createPhoneUrl,
  createWebsiteUrl,
} from './contactQuickActions.ts';

export type PhonebookPlatform = 'android' | 'ios';

export interface PhonebookCreateRecord {
  givenName?: string;
  company?: string;
  jobTitle?: string;
  note?: string;
  phones?: { label: string; number: string }[];
  emails?: { label: string; address: string }[];
  addresses?: { label: string; street: string }[];
  urlAddresses?: { label: string; url: string }[];
  socialProfiles?: { label: string; service: string; url: string }[];
}

export interface AccessiblePhonebookContact {
  id: string;
  phones?: { number?: string }[] | null;
  emails?: { address?: string }[] | null;
}

export interface PhonebookPermissionResponse {
  status: 'granted' | 'denied' | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
  accessPrivileges?: 'all' | 'limited' | 'none';
}

export interface PhonebookExportApi {
  getPermission(): Promise<PhonebookPermissionResponse>;
  requestPermission(): Promise<PhonebookPermissionResponse>;
  getContactPage(limit: number, offset: number): Promise<AccessiblePhonebookContact[]>;
  createContact(record: PhonebookCreateRecord): Promise<void>;
}

export type PhonebookPermissionResult =
  | { kind: 'granted'; coverage: 'all' | 'limited' }
  | { kind: 'denied' }
  | { kind: 'blocked' }
  | { kind: 'unavailable'; error: unknown };

export interface PhonebookDuplicateMatch {
  id: string;
  matchedPhones: string[];
  matchedEmails: string[];
}

export interface PhonebookScanResult {
  contacts: AccessiblePhonebookContact[];
  complete: boolean;
  error?: unknown;
}

export interface AsyncActionGuard {
  run<T>(action: () => Promise<T>): Promise<{ started: true; value: T } | { started: false }>;
}

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

const cleanText = (value: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && !CONTROL_CHARACTER_PATTERN.test(trimmed) ? trimmed : undefined;
};

const validPhones = (values: readonly string[]): string[] =>
  values.flatMap((value) => {
    const result = createPhoneUrl(value);
    return result.url ? [result.url.slice('tel:'.length)] : [];
  });

const validEmails = (values: readonly string[]): string[] =>
  values.flatMap((value) => {
    const result = createEmailUrl(value);
    return result.url ? [result.url.slice('mailto:'.length)] : [];
  });

export const createPhonebookRecord = (
  contact: Contact,
  platform: PhonebookPlatform
): PhonebookCreateRecord => {
  const record: PhonebookCreateRecord = {};
  const name = cleanText(contact.name);
  const company = cleanText(contact.company);
  const designation = cleanText(contact.designation);
  const address = cleanText(contact.address);
  const notes = cleanText(contact.notes);
  const phones = validPhones(contact.phones);
  const emails = validEmails(contact.emails);
  const website = contact.website ? createWebsiteUrl(contact.website).url : undefined;
  const linkedin = contact.linkedin ? createLinkedInUrl(contact.linkedin).url : undefined;

  if (name) record.givenName = name;
  if (company) record.company = company;
  if (designation) record.jobTitle = designation;
  if (platform === 'android' && notes) record.note = notes;
  if (phones.length > 0) {
    record.phones = phones.map((number) => ({ label: 'work', number }));
  }
  if (emails.length > 0) {
    record.emails = emails.map((emailAddress) => ({ label: 'work', address: emailAddress }));
  }
  if (address) record.addresses = [{ label: 'work', street: address }];

  const urlAddresses: NonNullable<PhonebookCreateRecord['urlAddresses']> = [];
  if (website) urlAddresses.push({ label: 'website', url: website });
  if (platform === 'android' && linkedin) {
    urlAddresses.push({ label: 'LinkedIn', url: linkedin });
  }
  if (urlAddresses.length > 0) record.urlAddresses = urlAddresses;

  if (platform === 'ios' && linkedin) {
    record.socialProfiles = [
      { label: 'LinkedIn', service: 'LinkedIn', url: linkedin },
    ];
  }

  return record;
};

export const hasExportablePhonebookFields = (record: PhonebookCreateRecord): boolean =>
  Boolean(
    record.givenName ||
      record.company ||
      record.jobTitle ||
      record.note ||
      record.phones?.length ||
      record.emails?.length ||
      record.addresses?.length ||
      record.urlAddresses?.length ||
      record.socialProfiles?.length
  );

export const resolvePhonebookPermission = async (
  api: PhonebookExportApi
): Promise<PhonebookPermissionResult> => {
  try {
    let permission = await api.getPermission();
    if (permission.status === 'undetermined') {
      permission = await api.requestPermission();
    }

    if (permission.granted && permission.accessPrivileges !== 'none') {
      return {
        kind: 'granted',
        coverage: permission.accessPrivileges === 'limited' ? 'limited' : 'all',
      };
    }

    return permission.canAskAgain ? { kind: 'denied' } : { kind: 'blocked' };
  } catch (error) {
    return { kind: 'unavailable', error };
  }
};

export const scanAllAccessiblePhonebookContacts = async (
  api: PhonebookExportApi,
  pageSize: number = 200
): Promise<PhonebookScanResult> => {
  const contacts: AccessiblePhonebookContact[] = [];
  const seenIds = new Set<string>();
  let offset = 0;

  try {
    while (true) {
      const page = await api.getContactPage(pageSize, offset);
      let newContactCount = 0;

      for (const contact of page) {
        if (seenIds.has(contact.id)) continue;
        seenIds.add(contact.id);
        contacts.push(contact);
        newContactCount += 1;
      }

      if (page.length < pageSize) return { contacts, complete: true };
      if (newContactCount === 0) {
        return {
          contacts,
          complete: false,
          error: new Error('Phonebook pagination repeated a page without new contacts.'),
        };
      }

      offset += page.length;
    }
  } catch (error) {
    return { contacts, complete: false, error };
  }
};

export const findPhonebookDuplicateMatches = (
  existingContacts: readonly AccessiblePhonebookContact[],
  record: PhonebookCreateRecord
): PhonebookDuplicateMatch[] => {
  const candidatePhones = new Set(
    (record.phones ?? [])
      .map(({ number }) => normalizePhoneForComparison(number))
      .filter(Boolean)
  );
  const candidateEmails = new Set(
    (record.emails ?? [])
      .map(({ address }) => normalizeEmailForComparison(address))
      .filter(Boolean)
  );

  return existingContacts.flatMap((contact) => {
    const matchedPhones = (contact.phones ?? [])
      .map(({ number }) => number?.trim())
      .filter((number): number is string => Boolean(number))
      .filter((number) => candidatePhones.has(normalizePhoneForComparison(number)));
    const matchedEmails = (contact.emails ?? [])
      .map(({ address }) => address?.trim())
      .filter((address): address is string => Boolean(address))
      .filter((address) => candidateEmails.has(normalizeEmailForComparison(address)));

    return matchedPhones.length > 0 || matchedEmails.length > 0
      ? [{ id: contact.id, matchedPhones, matchedEmails }]
      : [];
  });
};

export const hasDuplicateCheckValues = (record: PhonebookCreateRecord): boolean =>
  Boolean(record.phones?.length || record.emails?.length);

export const createAsyncActionGuard = (): AsyncActionGuard => {
  let running = false;

  return {
    async run<T>(action: () => Promise<T>) {
      if (running) return { started: false };
      running = true;

      try {
        return { started: true, value: await action() };
      } finally {
        running = false;
      }
    },
  };
};
