import * as SQLite from 'expo-sqlite';
import { migrateContactsDatabase } from './databaseMigrations';

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('cardapp.db');

  await db.execAsync('PRAGMA journal_mode = WAL;');
  await migrateContactsDatabase(db);

  return db;
}
