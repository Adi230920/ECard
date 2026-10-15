import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createContactDraftFromSaved,
  createEditableContactUpdate,
  deleteSavedContact,
  updateSavedContact,
} from './contactEditing.ts';

const makeContact = (overrides = {}) => ({
  id: 7,
  name: 'Ana Silva',
  designation: null,
  company: 'Acme',
  phones: ['+1 212 555 0198', '212-555-0133'],
  emails: ['ana@example.com', 'sales@example.com'],
  website: null,
  address: '42 Main Street',
  linkedin: 'linkedin.com/in/ana',
  notes: null,
  image_path: 'file:///documents/card.jpg',
  raw_ocr_text: 'Ana Silva\nAcme',
  created_at: '2026-10-14T00:00:00.000Z',
  updated_at: '2026-10-14T00:00:00.000Z',
  ...overrides,
});

test('prepopulates every editable field and copies multiple values', () => {
  const saved = makeContact();
  const draft = createContactDraftFromSaved(saved);

  assert.deepEqual(draft, {
    name: 'Ana Silva',
    designation: '',
    company: 'Acme',
    phones: ['+1 212 555 0198', '212-555-0133'],
    emails: ['ana@example.com', 'sales@example.com'],
    website: '',
    address: '42 Main Street',
    linkedin: 'linkedin.com/in/ana',
    notes: '',
  });

  draft.phones.pop();
  draft.emails.push('new@example.com');
  assert.equal(saved.phones.length, 2);
  assert.equal(saved.emails.length, 2);
});

test('creates an update containing editable fields but no image or OCR data', () => {
  const update = createEditableContactUpdate(
    createContactDraftFromSaved(
      makeContact({ phones: ['+91 98765 43210'], emails: ['ana@example.com'] })
    )
  );

  assert.deepEqual(update.phones, ['+91 98765 43210']);
  assert.deepEqual(update.emails, ['ana@example.com']);
  assert.equal(update.designation, null);
  assert.equal(Object.hasOwn(update, 'image_path'), false);
  assert.equal(Object.hasOwn(update, 'raw_ocr_text'), false);
});

test('updates the selected record without inserting another contact', async () => {
  const calls = [];
  const repository = {
    update: async (id, contact) => calls.push({ operation: 'update', id, contact }),
    deleteContact: async () => undefined,
  };
  const update = createEditableContactUpdate(createContactDraftFromSaved(makeContact()));

  await updateSavedContact(repository, 7, update);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].operation, 'update');
  assert.equal(calls[0].id, 7);
});

test('deletes only the selected record and propagates database failures', async () => {
  const deletedIds = [];
  const repository = {
    update: async () => {
      throw new Error('update failed');
    },
    deleteContact: async (id) => deletedIds.push(id),
  };
  const update = createEditableContactUpdate(createContactDraftFromSaved(makeContact()));

  await deleteSavedContact(repository, 7);
  assert.deepEqual(deletedIds, [7]);
  await assert.rejects(() => updateSavedContact(repository, 7, update), /update failed/);
});

test('propagates delete failures without targeting another record', async () => {
  const attemptedIds = [];
  const repository = {
    update: async () => undefined,
    deleteContact: async (id) => {
      attemptedIds.push(id);
      throw new Error('delete failed');
    },
  };

  await assert.rejects(() => deleteSavedContact(repository, 9), /delete failed/);
  assert.deepEqual(attemptedIds, [9]);
});
