const CONTACT_ORDER_BY = `ORDER BY
  CASE WHEN TRIM(COALESCE(name, '')) = '' THEN 1 ELSE 0 END,
  CASE
    WHEN TRIM(COALESCE(name, '')) = '' THEN TRIM(COALESCE(company, ''))
    ELSE TRIM(name)
  END COLLATE NOCASE ASC,
  id ASC`;

export const GET_ALL_CONTACTS_SQL = `SELECT * FROM contacts ${CONTACT_ORDER_BY}`;

export const SEARCH_CONTACTS_SQL = `SELECT * FROM contacts
  WHERE COALESCE(name, '') COLLATE NOCASE LIKE ? ESCAPE '\\'
     OR COALESCE(company, '') COLLATE NOCASE LIKE ? ESCAPE '\\'
  ${CONTACT_ORDER_BY}`;

export const createContactSearchPattern = (query: string): string =>
  `%${query.trim().replace(/[\\%_]/g, '\\$&')}%`;
