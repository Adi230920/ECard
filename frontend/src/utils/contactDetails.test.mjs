import assert from 'node:assert/strict';
import test from 'node:test';
import { createContactDetailViewModel } from './contactDetails.ts';

const makeContact = (overrides = {}) => ({
  id: 1,
  name: 'Ana Silva',
  designation: 'Director',
  company: 'Acme Studio',
  phones: ['+1 212 555 0198'],
  emails: ['ana@example.com'],
  website: 'https://example.com',
  address: '42 Main Street',
  linkedin: 'linkedin.com/in/ana',
  notes: 'Met at a conference',
  image_path: 'file:///documents/card.jpg',
  raw_ocr_text: 'Ana Silva',
  created_at: '2026-10-15T00:00:00.000Z',
  updated_at: '2026-10-15T00:00:00.000Z',
  ...overrides,
});

test('includes every saved contact detail and local image path', () => {
  const model = createContactDetailViewModel(makeContact());

  assert.equal(model.displayName, 'Ana Silva');
  assert.equal(model.designation, 'Director');
  assert.equal(model.company, 'Acme Studio');
  assert.equal(model.imagePath, 'file:///documents/card.jpg');
  assert.deepEqual(model.sections.map((section) => section.key), [
    'phones',
    'emails',
    'website',
    'linkedin',
    'address',
    'notes',
  ]);
});

test('preserves multiple phone numbers and email addresses', () => {
  const model = createContactDetailViewModel(
    makeContact({
      phones: [' +91 98765 43210 ', '080 5555 0101'],
      emails: [' ana@example.com ', 'sales@example.com'],
    })
  );

  assert.deepEqual(model.sections.find((section) => section.key === 'phones')?.values, [
    '+91 98765 43210',
    '080 5555 0101',
  ]);
  assert.deepEqual(model.sections.find((section) => section.key === 'emails')?.values, [
    'ana@example.com',
    'sales@example.com',
  ]);
});

test('omits missing fields and supplies an unnamed-contact fallback', () => {
  const model = createContactDetailViewModel(
    makeContact({
      name: '  ',
      designation: null,
      company: '',
      phones: ['', '   '],
      emails: [],
      website: null,
      address: ' ',
      linkedin: null,
      notes: '',
      image_path: ' ',
    })
  );

  assert.equal(model.displayName, 'Unnamed contact');
  assert.equal(model.designation, undefined);
  assert.equal(model.company, undefined);
  assert.equal(model.imagePath, undefined);
  assert.deepEqual(model.sections, []);
});
