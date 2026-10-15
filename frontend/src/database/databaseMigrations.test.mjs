import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  CONTACT_DATABASE_VERSION,
  migrateContactsDatabase,
} from './databaseMigrations.ts';

const createAdapter = (database, beforeExec = () => undefined) => {
  const connection = {
    async execAsync(sql) {
      beforeExec(sql);
      database.exec(sql);
    },
    async getAllAsync(sql) {
      return database.prepare(sql).all();
    },
    async getFirstAsync(sql) {
      return database.prepare(sql).get() ?? null;
    },
  };

  return {
    ...connection,
    async withExclusiveTransactionAsync(task) {
      database.exec('BEGIN EXCLUSIVE');
      try {
        await task(connection);
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
};

test('creates the current schema transactionally for a new database', async () => {
  const database = new DatabaseSync(':memory:');

  await migrateContactsDatabase(createAdapter(database));

  const columns = database.prepare('PRAGMA table_info(contacts)').all();
  const version = database.prepare('PRAGMA user_version').get().user_version;
  const indexes = database.prepare("PRAGMA index_list('contacts')").all();

  assert.equal(version, CONTACT_DATABASE_VERSION);
  assert.ok(columns.some(({ name }) => name === 'raw_ocr_text'));
  assert.ok(indexes.some(({ name }) => name === 'idx_contacts_name'));
  assert.ok(indexes.some(({ name }) => name === 'idx_contacts_company'));
});

test('upgrades an existing contact table without changing saved records', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      designation TEXT,
      company TEXT,
      phones TEXT,
      emails TEXT,
      website TEXT,
      address TEXT,
      linkedin TEXT,
      notes TEXT,
      image_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO contacts (
      name, phones, emails, image_path, created_at, updated_at
    ) VALUES (
      'Existing Person', '["+919876543210"]', '["saved@example.com"]',
      'file:///saved-card.jpg', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
    );
  `);

  await migrateContactsDatabase(createAdapter(database));

  const contact = database.prepare('SELECT * FROM contacts WHERE id = 1').get();
  assert.equal(contact.name, 'Existing Person');
  assert.equal(contact.phones, '["+919876543210"]');
  assert.equal(contact.emails, '["saved@example.com"]');
  assert.equal(contact.image_path, 'file:///saved-card.jpg');
  assert.equal(contact.raw_ocr_text, null);
});

test('rolls back every migration change when an upgrade fails', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      designation TEXT,
      company TEXT,
      phones TEXT,
      emails TEXT,
      website TEXT,
      address TEXT,
      linkedin TEXT,
      notes TEXT,
      image_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO contacts (name, created_at, updated_at)
    VALUES ('Preserved Person', '2026-01-01', '2026-01-01');
  `);

  const adapter = createAdapter(database, (sql) => {
    if (sql.includes('ALTER TABLE')) throw new Error('simulated migration failure');
  });

  await assert.rejects(migrateContactsDatabase(adapter), /simulated migration failure/);

  const columns = database.prepare('PRAGMA table_info(contacts)').all();
  const contact = database.prepare('SELECT * FROM contacts WHERE id = 1').get();
  assert.equal(database.prepare('PRAGMA user_version').get().user_version, 0);
  assert.equal(columns.some(({ name }) => name === 'raw_ocr_text'), false);
  assert.equal(contact.name, 'Preserved Person');
});
