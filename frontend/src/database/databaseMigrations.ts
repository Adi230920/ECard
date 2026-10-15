export const CONTACT_DATABASE_VERSION = 1;

export interface MigrationConnection {
  execAsync(sql: string): Promise<void>;
  getAllAsync<Row>(sql: string): Promise<Row[]>;
  getFirstAsync<Row>(sql: string): Promise<Row | null>;
}

export interface MigrationDatabase extends MigrationConnection {
  withExclusiveTransactionAsync(
    task: (transaction: MigrationConnection) => Promise<void>
  ): Promise<void>;
}

const createContactsTable = async (database: MigrationConnection): Promise<void> => {
  await database.execAsync(`
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
  `);
};

const migrateToVersionOne = async (database: MigrationConnection): Promise<void> => {
  await createContactsTable(database);

  const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(contacts)');
  if (!columns.some((column) => column.name === 'raw_ocr_text')) {
    await database.execAsync('ALTER TABLE contacts ADD COLUMN raw_ocr_text TEXT;');
  }

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
    CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
    PRAGMA user_version = ${CONTACT_DATABASE_VERSION};
  `);
};

export const migrateContactsDatabase = async (database: MigrationDatabase): Promise<void> => {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const versionRow = await transaction.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    );
    const currentVersion = versionRow?.user_version ?? 0;

    if (currentVersion > CONTACT_DATABASE_VERSION) {
      throw new Error(
        `Database version ${currentVersion} is newer than supported version ${CONTACT_DATABASE_VERSION}.`
      );
    }

    if (currentVersion < 1) {
      await migrateToVersionOne(transaction);
    }
  });
};
