import type { Contact } from '../types/contact';

export interface DBContactRow {
  id: number;
  name: string | null;
  designation: string | null;
  company: string | null;
  phones: string | null;
  emails: string | null;
  website: string | null;
  address: string | null;
  linkedin: string | null;
  notes: string | null;
  image_path: string | null;
  raw_ocr_text: string | null;
  created_at: string;
  updated_at: string;
}

const parseStringArray = (value: string | null): string[] => {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

export const mapRowToContact = (row: DBContactRow): Contact => ({
  ...row,
  phones: parseStringArray(row.phones),
  emails: parseStringArray(row.emails),
});
