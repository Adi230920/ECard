import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRowToContact } from './contactRowMapping.ts';

const createRow = (overrides = {}) => ({
  id: 1,
  name: 'Saved Person',
  designation: null,
  company: null,
  phones: '["+1 212 555 0198"]',
  emails: '["saved@example.com"]',
  website: null,
  address: null,
  linkedin: null,
  notes: null,
  image_path: null,
  raw_ocr_text: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...overrides,
});

test('maps valid stored phone and email arrays', () => {
  const contact = mapRowToContact(createRow());
  assert.deepEqual(contact.phones, ['+1 212 555 0198']);
  assert.deepEqual(contact.emails, ['saved@example.com']);
});

test('recovers from malformed or incorrectly typed stored arrays', () => {
  assert.deepEqual(mapRowToContact(createRow({ phones: '{broken' })).phones, []);
  assert.deepEqual(mapRowToContact(createRow({ emails: '"not-an-array"' })).emails, []);
  assert.deepEqual(
    mapRowToContact(createRow({ phones: '["valid", 42, null]' })).phones,
    ['valid']
  );
});
