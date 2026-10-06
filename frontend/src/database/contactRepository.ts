import * as SQLite from 'expo-sqlite';
import { Contact, ContactInsert } from '../types/contact';

// Internal type mirroring the DB row
interface DBContactRow {
  id: number;
  name: string | null;
  designation: string | null;
  company: string | null;
  phones: string | null; // JSON string
  emails: string | null; // JSON string
  website: string | null;
  address: string | null;
  linkedin: string | null;
  notes: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

const mapRowToContact = (row: DBContactRow): Contact => {
  return {
    ...row,
    phones: row.phones ? JSON.parse(row.phones) : [],
    emails: row.emails ? JSON.parse(row.emails) : [],
  };
};

export class ContactRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    this.db = await SQLite.openDatabaseAsync('cardapp.db');
  }

  async getRecent(limit: number = 5): Promise<Contact[]> {
    if (!this.db) await this.init();
    const rows = await this.db!.getAllAsync<DBContactRow>(
      'SELECT * FROM contacts ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(mapRowToContact);
  }

  async getAll(): Promise<Contact[]> {
    if (!this.db) await this.init();
    const rows = await this.db!.getAllAsync<DBContactRow>(
      'SELECT * FROM contacts ORDER BY name ASC'
    );
    return rows.map(mapRowToContact);
  }

  async getById(id: number): Promise<Contact | null> {
    if (!this.db) await this.init();
    const row = await this.db!.getFirstAsync<DBContactRow>(
      'SELECT * FROM contacts WHERE id = ?',
      [id]
    );
    return row ? mapRowToContact(row) : null;
  }

  async insert(contact: ContactInsert): Promise<number> {
    if (!this.db) await this.init();
    
    const now = new Date().toISOString();
    
    const result = await this.db!.runAsync(
      `INSERT INTO contacts (
        name, designation, company, phones, emails, website, address, linkedin, notes, image_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contact.name,
        contact.designation,
        contact.company,
        JSON.stringify(contact.phones),
        JSON.stringify(contact.emails),
        contact.website,
        contact.address,
        contact.linkedin,
        contact.notes,
        contact.image_path,
        now,
        now
      ]
    );
    
    return result.lastInsertRowId;
  }

  async update(id: number, contact: Partial<ContactInsert>): Promise<void> {
    if (!this.db) await this.init();
    
    const now = new Date().toISOString();
    
    const existingRow = await this.db!.getFirstAsync<DBContactRow>('SELECT * FROM contacts WHERE id = ?', [id]);
    if (!existingRow) throw new Error('Contact not found');
    
    const existing = mapRowToContact(existingRow);
    const updated = { ...existing, ...contact };
    
    await this.db!.runAsync(
      `UPDATE contacts SET 
        name = ?, designation = ?, company = ?, phones = ?, emails = ?, website = ?, address = ?, linkedin = ?, notes = ?, image_path = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.designation,
        updated.company,
        JSON.stringify(updated.phones),
        JSON.stringify(updated.emails),
        updated.website,
        updated.address,
        updated.linkedin,
        updated.notes,
        updated.image_path,
        now,
        id
      ]
    );
  }

  async deleteContact(id: number): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.runAsync('DELETE FROM contacts WHERE id = ?', [id]);
  }

  async search(query: string): Promise<Contact[]> {
    if (!this.db) await this.init();
    const searchStr = `%${query}%`;
    const rows = await this.db!.getAllAsync<DBContactRow>(
      'SELECT * FROM contacts WHERE name LIKE ? OR company LIKE ? ORDER BY name ASC',
      [searchStr, searchStr]
    );
    return rows.map(mapRowToContact);
  }
}

export const contactRepository = new ContactRepository();
