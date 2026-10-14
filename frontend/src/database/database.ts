import * as SQLite from 'expo-sqlite';

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('cardapp.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS contacts (
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
      raw_ocr_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
    CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
  `);

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(contacts)');
  if (!columns.some((column) => column.name === 'raw_ocr_text')) {
    await db.execAsync('ALTER TABLE contacts ADD COLUMN raw_ocr_text TEXT;');
  }

  return db;
}
