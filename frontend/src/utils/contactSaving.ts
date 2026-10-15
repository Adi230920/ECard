import type { Contact } from '../types/contact';
import {
  createEmailUrl,
  createLinkedInUrl,
  createWebsiteUrl,
} from './contactQuickActions.ts';

export interface ContactDraft {
  name: string;
  designation: string;
  company: string;
  phones: string[];
  emails: string[];
  website: string;
  address: string;
  linkedin: string;
  notes: string;
}

export interface DuplicateContactMatch {
  contact: Contact;
  matchedPhones: string[];
  matchedEmails: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

export const normalizePhoneForComparison = (value: string): string => {
  const extension = value.match(/(?:x|ext\.?|extension)\s*(\d+)/i)?.[1];
  const mainNumber = value.replace(/(?:x|ext\.?|extension)\s*\d+/gi, '').replace(/\D/g, '');
  return `${mainNumber}${extension ? `x${extension}` : ''}`;
};

export const normalizeEmailForComparison = (value: string): string =>
  value.trim().toLocaleLowerCase();

const uniqueTrimmedValues = (
  values: readonly string[],
  normalize: (value: string) => string
): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const normalized = normalize(trimmed);
    if (!trimmed || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(trimmed);
  }

  return result;
};

export const sanitizeContactDraft = (draft: ContactDraft): ContactDraft => ({
  name: draft.name.trim(),
  designation: draft.designation.trim(),
  company: draft.company.trim(),
  phones: uniqueTrimmedValues(draft.phones, normalizePhoneForComparison),
  emails: uniqueTrimmedValues(draft.emails, normalizeEmailForComparison),
  website: draft.website.trim(),
  address: draft.address.trim(),
  linkedin: draft.linkedin.trim(),
  notes: draft.notes.trim(),
});

export const validateContactDraft = (draft: ContactDraft): string[] => {
  const errors: string[] = [];
  const textValues = [
    draft.name,
    draft.designation,
    draft.company,
    draft.website,
    draft.address,
    draft.linkedin,
    draft.notes,
  ];

  if (!textValues.some(Boolean) && draft.phones.length === 0 && draft.emails.length === 0) {
    errors.push('Enter at least one contact detail before saving.');
  }

  if (draft.phones.some((phone) => phone.replace(/\D/g, '').length < 3)) {
    errors.push('Each phone number must contain at least three digits.');
  }

  if (
    draft.phones.some((phone) => {
      const digitCount = phone.replace(/\D/g, '').length;
      return CONTROL_CHARACTER_PATTERN.test(phone) || digitCount > 15;
    })
  ) {
    errors.push('Each phone number must contain no more than fifteen digits.');
  }

  if (draft.emails.some((email) => !EMAIL_PATTERN.test(email) || !createEmailUrl(email).url)) {
    errors.push('Check that each email address is complete.');
  }

  if (draft.website && !createWebsiteUrl(draft.website).url) {
    errors.push('Check that the website uses a valid HTTP or HTTPS address.');
  }

  if (draft.linkedin && !createLinkedInUrl(draft.linkedin).url) {
    errors.push('Check that LinkedIn contains a valid profile or company address.');
  }

  if (textValues.some((value) => CONTROL_CHARACTER_PATTERN.test(value))) {
    errors.push('Contact text cannot contain unsupported control characters.');
  }

  return errors;
};

export const findDuplicateContactMatches = (
  contacts: readonly Contact[],
  phones: readonly string[],
  emails: readonly string[],
  excludedContactId?: number
): DuplicateContactMatch[] => {
  const candidatePhones = new Set(phones.map(normalizePhoneForComparison).filter(Boolean));
  const candidateEmails = new Set(emails.map(normalizeEmailForComparison).filter(Boolean));

  return contacts.flatMap((contact) => {
    if (contact.id === excludedContactId) return [];

    const matchedPhones = contact.phones.filter((phone) =>
      candidatePhones.has(normalizePhoneForComparison(phone))
    );
    const matchedEmails = contact.emails.filter((email) =>
      candidateEmails.has(normalizeEmailForComparison(email))
    );

    return matchedPhones.length > 0 || matchedEmails.length > 0
      ? [{ contact, matchedPhones, matchedEmails }]
      : [];
  });
};
