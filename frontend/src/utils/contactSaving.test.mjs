import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findDuplicateContactMatches,
  normalizeEmailForComparison,
  normalizePhoneForComparison,
  sanitizeContactDraft,
  validateContactDraft,
} from './contactSaving.ts';

const makeContact = (overrides = {}) => ({
  id: 1,
  name: 'Saved Person',
  designation: null,
  company: 'Saved Company',
  phones: [],
  emails: [],
  website: null,
  address: null,
  linkedin: null,
  notes: null,
  image_path: null,
  raw_ocr_text: null,
  created_at: '2026-10-14T00:00:00.000Z',
  updated_at: '2026-10-14T00:00:00.000Z',
  ...overrides,
});

const makeDraft = (overrides = {}) => ({
  name: '',
  designation: '',
  company: '',
  phones: [],
  emails: [],
  website: '',
  address: '',
  linkedin: '',
  notes: '',
  ...overrides,
});

test('normalizes phone numbers and emails for duplicate comparison', () => {
  assert.equal(normalizePhoneForComparison('+91 (98765) 43210 ext. 7'), '919876543210x7');
  assert.equal(normalizeEmailForComparison(' Person@Example.COM '), 'person@example.com');
});

test('sanitizes fields while retaining multiple distinct phone numbers and emails', () => {
  const sanitized = sanitizeContactDraft(
    makeDraft({
      name: '  Ana Silva  ',
      phones: [' +1 (212) 555-0198 ', '', '+1 212 555 0198', '212-555-0133'],
      emails: [' ANA@example.com ', 'ana@EXAMPLE.com', 'sales@example.com', ''],
    })
  );

  assert.equal(sanitized.name, 'Ana Silva');
  assert.deepEqual(sanitized.phones, ['+1 (212) 555-0198', '212-555-0133']);
  assert.deepEqual(sanitized.emails, ['ANA@example.com', 'sales@example.com']);
});

test('allows incomplete cards while validating provided contact values', () => {
  assert.deepEqual(validateContactDraft(makeDraft({ company: 'Acme' })), []);
  assert.deepEqual(validateContactDraft(makeDraft()), [
    'Enter at least one contact detail before saving.',
  ]);
  assert.deepEqual(
    validateContactDraft(makeDraft({ phones: ['ab'], emails: ['missing-domain@'] })),
    [
      'Each phone number must contain at least three digits.',
      'Check that each email address is complete.',
    ]
  );
});

test('rejects unsafe or unusable contact values before saving', () => {
  const errors = validateContactDraft(
    makeDraft({
      name: 'Unsafe\u0000Name',
      phones: ['1234567890123456'],
      emails: ['person@example.com?subject=unsafe'],
      website: 'javascript:alert(1)',
      linkedin: 'https://example.com/in/person',
    })
  );

  assert.deepEqual(errors, [
    'Each phone number must contain no more than fifteen digits.',
    'Check that each email address is complete.',
    'Check that the website uses a valid HTTP or HTTPS address.',
    'Check that LinkedIn contains a valid profile or company address.',
    'Contact text cannot contain unsupported control characters.',
  ]);
});

test('finds duplicates only through normalized phones and emails', () => {
  const phoneMatch = makeContact({
    id: 1,
    name: 'Phone Match',
    phones: ['+1 (212) 555-0198'],
  });
  const emailMatch = makeContact({
    id: 2,
    name: 'Email Match',
    emails: ['PERSON@example.com'],
  });
  const sameNameOnly = makeContact({
    id: 3,
    name: 'New Person',
    company: 'New Company',
  });

  const matches = findDuplicateContactMatches(
    [phoneMatch, emailMatch, sameNameOnly],
    ['+1 212 555 0198'],
    ['person@EXAMPLE.com']
  );

  assert.deepEqual(matches.map((match) => match.contact.id), [1, 2]);
  assert.deepEqual(matches[0].matchedPhones, ['+1 (212) 555-0198']);
  assert.deepEqual(matches[1].matchedEmails, ['PERSON@example.com']);
});

test('excludes the edited contact while retaining other duplicate matches', () => {
  const editedContact = makeContact({
    id: 7,
    phones: ['+91 98765 43210'],
    emails: ['same@example.com'],
  });
  const otherContact = makeContact({
    id: 8,
    phones: ['+91 98765 43210'],
    emails: [],
  });

  const matches = findDuplicateContactMatches(
    [editedContact, otherContact],
    ['+91 98765 43210'],
    ['same@example.com'],
    7
  );

  assert.deepEqual(matches.map((match) => match.contact.id), [8]);
});
