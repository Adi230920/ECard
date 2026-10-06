export interface Contact {
  id: number;
  name: string | null;
  designation: string | null;
  company: string | null;
  phones: string[]; // JSON array in DB
  emails: string[]; // JSON array in DB
  website: string | null;
  address: string | null;
  linkedin: string | null;
  notes: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export type ContactInsert = Omit<Contact, 'id' | 'created_at' | 'updated_at'>;
