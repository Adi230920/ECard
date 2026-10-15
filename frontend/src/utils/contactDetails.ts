import type { Contact } from '../types/contact';

export interface ContactDetailSection {
  key: 'phones' | 'emails' | 'website' | 'linkedin' | 'address' | 'notes';
  label: string;
  values: string[];
}

export interface ContactDetailViewModel {
  displayName: string;
  designation?: string;
  company?: string;
  imagePath?: string;
  sections: ContactDetailSection[];
}

const cleanText = (value: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

const cleanValues = (values: readonly string[]): string[] =>
  values.map((value) => value.trim()).filter(Boolean);

export const createContactDetailViewModel = (contact: Contact): ContactDetailViewModel => {
  const sections: ContactDetailSection[] = [];
  const phones = cleanValues(contact.phones);
  const emails = cleanValues(contact.emails);
  const website = cleanText(contact.website);
  const linkedin = cleanText(contact.linkedin);
  const address = cleanText(contact.address);
  const notes = cleanText(contact.notes);

  if (phones.length > 0) sections.push({ key: 'phones', label: 'Phone numbers', values: phones });
  if (emails.length > 0) sections.push({ key: 'emails', label: 'Email addresses', values: emails });
  if (website) sections.push({ key: 'website', label: 'Website', values: [website] });
  if (linkedin) sections.push({ key: 'linkedin', label: 'LinkedIn', values: [linkedin] });
  if (address) sections.push({ key: 'address', label: 'Address', values: [address] });
  if (notes) sections.push({ key: 'notes', label: 'Notes', values: [notes] });

  return {
    displayName: cleanText(contact.name) ?? 'Unnamed contact',
    designation: cleanText(contact.designation),
    company: cleanText(contact.company),
    imagePath: cleanText(contact.image_path),
    sections,
  };
};
