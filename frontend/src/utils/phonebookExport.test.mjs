import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAsyncActionGuard,
  createPhonebookRecord,
  findPhonebookDuplicateMatches,
  hasDuplicateCheckValues,
  hasExportablePhonebookFields,
  resolvePhonebookPermission,
  scanAllAccessiblePhonebookContacts,
} from './phonebookExport.ts';

const makeContact = (overrides = {}) => ({
  id: 1,
  name: 'Ana Maria Silva',
  designation: 'Director',
  company: 'Acme Studio',
  phones: ['+1 (212) 555-0198', 'invalid'],
  emails: ['ana@example.com', 'missing-domain@'],
  website: 'example.com',
  address: '42 Main Street, Bengaluru',
  linkedin: 'linkedin.com/in/ana-silva',
  notes: 'Met at a conference',
  image_path: 'file:///documents/card.jpg',
  raw_ocr_text: 'Ana Maria Silva',
  created_at: '2026-10-15T00:00:00.000Z',
  updated_at: '2026-10-15T00:00:00.000Z',
  ...overrides,
});

const makeApi = (overrides = {}) => ({
  getPermission: async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
    accessPrivileges: 'all',
  }),
  requestPermission: async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
    accessPrivileges: 'all',
  }),
  getContactPage: async () => [],
  createContact: async () => undefined,
  ...overrides,
});

test('maps valid fields and multiple values without guessing name parts', () => {
  const android = createPhonebookRecord(
    makeContact({
      phones: ['+1 (212) 555-0198', '080 5555 0101'],
      emails: ['ana@example.com', 'sales@example.com'],
    }),
    'android'
  );

  assert.equal(android.givenName, 'Ana Maria Silva');
  assert.equal(android.familyName, undefined);
  assert.equal(android.company, 'Acme Studio');
  assert.equal(android.jobTitle, 'Director');
  assert.deepEqual(android.phones?.map(({ number }) => number), [
    '+12125550198',
    '08055550101',
  ]);
  assert.deepEqual(android.emails?.map(({ address }) => address), [
    'ana@example.com',
    'sales@example.com',
  ]);
  assert.equal(android.note, 'Met at a conference');
  assert.equal(android.addresses?.[0].street, '42 Main Street, Bengaluru');
  assert.deepEqual(android.urlAddresses?.map(({ label }) => label), ['website', 'LinkedIn']);
});

test('uses iOS social profiles and omits notes requiring extra entitlement', () => {
  const ios = createPhonebookRecord(makeContact(), 'ios');

  assert.equal(ios.note, undefined);
  assert.equal(ios.socialProfiles?.[0].service, 'LinkedIn');
  assert.deepEqual(ios.urlAddresses?.map(({ label }) => label), ['website']);
});

test('filters invalid values and detects contacts with nothing exportable', () => {
  const record = createPhonebookRecord(
    makeContact({
      name: ' ',
      designation: null,
      company: null,
      phones: ['ab'],
      emails: ['invalid@'],
      website: 'javascript:alert(1)',
      address: '\n',
      linkedin: 'example.com/profile',
      notes: null,
    }),
    'ios'
  );

  assert.equal(hasExportablePhonebookFields(record), false);
  assert.equal(hasDuplicateCheckValues(record), false);
});

test('requests undetermined permission and classifies limited, denied, and blocked access', async () => {
  let requestCount = 0;
  const limited = await resolvePhonebookPermission(
    makeApi({
      getPermission: async () => ({
        status: 'undetermined', granted: false, canAskAgain: true, accessPrivileges: 'none',
      }),
      requestPermission: async () => {
        requestCount += 1;
        return {
          status: 'granted', granted: true, canAskAgain: true, accessPrivileges: 'limited',
        };
      },
    })
  );
  const denied = await resolvePhonebookPermission(
    makeApi({
      getPermission: async () => ({ status: 'denied', granted: false, canAskAgain: true }),
    })
  );
  const blocked = await resolvePhonebookPermission(
    makeApi({
      getPermission: async () => ({ status: 'denied', granted: false, canAskAgain: false }),
    })
  );

  assert.equal(requestCount, 1);
  assert.deepEqual(limited, { kind: 'granted', coverage: 'limited' });
  assert.deepEqual(denied, { kind: 'denied' });
  assert.deepEqual(blocked, { kind: 'blocked' });
});

test('reports unavailable permissions when the native API fails', async () => {
  const result = await resolvePhonebookPermission(
    makeApi({ getPermission: async () => { throw new Error('module unavailable'); } })
  );

  assert.equal(result.kind, 'unavailable');
  assert.match(String(result.error), /module unavailable/);
});

test('scans every accessible page before declaring the check complete', async () => {
  const offsets = [];
  const contacts = Array.from({ length: 5 }, (_, index) => ({ id: `${index + 1}` }));
  const result = await scanAllAccessiblePhonebookContacts(
    makeApi({
      getContactPage: async (limit, offset) => {
        offsets.push(offset);
        return contacts.slice(offset, offset + limit);
      },
    }),
    2
  );

  assert.deepEqual(offsets, [0, 2, 4]);
  assert.equal(result.complete, true);
  assert.equal(result.contacts.length, 5);
});

test('marks failed or repeating pagination as incomplete', async () => {
  const partial = await scanAllAccessiblePhonebookContacts(
    makeApi({
      getContactPage: async (_limit, offset) => {
        if (offset > 0) throw new Error('query failed');
        return [{ id: '1' }, { id: '2' }];
      },
    }),
    2
  );
  const repeating = await scanAllAccessiblePhonebookContacts(
    makeApi({ getContactPage: async () => [{ id: '1' }, { id: '2' }] }),
    2
  );

  assert.equal(partial.complete, false);
  assert.equal(partial.contacts.length, 2);
  assert.match(String(partial.error), /query failed/);
  assert.equal(repeating.complete, false);
});

test('matches duplicates only through normalized phones and emails', () => {
  const record = createPhonebookRecord(makeContact(), 'android');
  const matches = findPhonebookDuplicateMatches(
    [
      { id: 'phone', phones: [{ number: '+1 212 555 0198' }] },
      { id: 'email', emails: [{ address: 'ANA@EXAMPLE.COM' }] },
      { id: 'other', phones: [{ number: '+1 212 555 0000' }] },
    ],
    record
  );

  assert.deepEqual(matches.map(({ id }) => id), ['phone', 'email']);
});

test('prevents a second action while export work is running', async () => {
  const guard = createAsyncActionGuard();
  let release;
  const pending = guard.run(
    () => new Promise((resolve) => { release = resolve; })
  );
  const repeated = await guard.run(async () => 'repeated');

  assert.deepEqual(repeated, { started: false });
  release('saved');
  assert.deepEqual(await pending, { started: true, value: 'saved' });
  assert.deepEqual(await guard.run(async () => 'again'), { started: true, value: 'again' });
});
