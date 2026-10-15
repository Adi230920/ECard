import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import {
  createContactSearchPattern,
  GET_ALL_CONTACTS_SQL,
  SEARCH_CONTACTS_SQL,
} from './contactQueries.ts';

const createDatabase = () => {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE contacts (
      id INTEGER PRIMARY KEY,
      name TEXT,
      company TEXT
    );

    INSERT INTO contacts (id, name, company) VALUES
      (1, 'zoe singh', 'Northstar'),
      (2, NULL, 'Beta Works'),
      (3, 'Alice Chen', 'Acme'),
      (4, '', 'Alpha Studio'),
      (5, 'alice Adams', 'Zenith'),
      (6, 'Percent Person', '100% Real');
  `);
  return database;
};

test('orders named contacts alphabetically and places unnamed contacts last', () => {
  const database = createDatabase();
  const rows = database.prepare(GET_ALL_CONTACTS_SQL).all();

  assert.deepEqual(rows.map((row) => row.id), [5, 3, 6, 1, 4, 2]);
  database.close();
});

test('searches names and companies without case sensitivity', () => {
  const database = createDatabase();
  const statement = database.prepare(SEARCH_CONTACTS_SQL);

  const namePattern = createContactSearchPattern('ALICE');
  const nameRows = statement.all(namePattern, namePattern);
  assert.deepEqual(nameRows.map((row) => row.id), [5, 3]);

  const companyPattern = createContactSearchPattern('northSTAR');
  const companyRows = statement.all(companyPattern, companyPattern);
  assert.deepEqual(companyRows.map((row) => row.id), [1]);
  database.close();
});

test('treats SQL wildcard characters as literal search text', () => {
  const database = createDatabase();
  const pattern = createContactSearchPattern('%');
  const rows = database.prepare(SEARCH_CONTACTS_SQL).all(pattern, pattern);

  assert.deepEqual(rows.map((row) => row.id), [6]);
  database.close();
});
