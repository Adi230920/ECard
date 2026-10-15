import type { Contact, ContactInsert } from '../types/contact';
import type { ContactDraft } from './contactSaving';

export type EditableContactUpdate = Omit<ContactInsert, 'image_path' | 'raw_ocr_text'>;

export interface ContactMutationRepository {
  update(id: number, contact: Partial<ContactInsert>): Promise<void>;
  deleteContact(id: number): Promise<void>;
}

const editableText = (value: string | null): string => value ?? '';
const optionalText = (value: string): string | null => value || null;

export const createContactDraftFromSaved = (contact: Contact): ContactDraft => ({
  name: editableText(contact.name),
  designation: editableText(contact.designation),
  company: editableText(contact.company),
  phones: [...contact.phones],
  emails: [...contact.emails],
  website: editableText(contact.website),
  address: editableText(contact.address),
  linkedin: editableText(contact.linkedin),
  notes: editableText(contact.notes),
});

export const createEditableContactUpdate = (
  contact: ContactDraft
): EditableContactUpdate => ({
  name: optionalText(contact.name),
  designation: optionalText(contact.designation),
  company: optionalText(contact.company),
  phones: [...contact.phones],
  emails: [...contact.emails],
  website: optionalText(contact.website),
  address: optionalText(contact.address),
  linkedin: optionalText(contact.linkedin),
  notes: optionalText(contact.notes),
});

export const updateSavedContact = async (
  repository: ContactMutationRepository,
  id: number,
  contact: EditableContactUpdate
): Promise<void> => {
  await repository.update(id, contact);
};

export const deleteSavedContact = async (
  repository: ContactMutationRepository,
  id: number
): Promise<void> => {
  await repository.deleteContact(id);
};
