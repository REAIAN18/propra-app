/**
 * src/lib/csv-parser.ts
 * CSV parsing utilities for bulk data imports.
 */

/**
 * Parse CSV content into records.
 * Handles quoted fields and escaped quotes.
 */
export function parseCSVData(csvContent: string, headers?: boolean): string[][] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line);

  if (lines.length === 0) return [];

  const records: string[][] = [];
  let startIndex = headers ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields && fields.length > 0) {
      records.push(fields);
    }
  }

  return records;
}

/**
 * Parse a single CSV line handling quoted fields.
 * Supports commas within quoted fields.
 *
 * Example: "123 MAIN STREET, LONDON","SW1A 1AA" → ["123 MAIN STREET, LONDON", "SW1A 1AA"]
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      // Check for escaped quote (two consecutive quotes)
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2; // Skip both quotes
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  if (current || fields.length > 0) {
    fields.push(current.trim());
  }

  return fields.map((f) => f.replace(/^"|"$/g, ''));
}

/**
 * Escape string for SQL INSERT/VALUES clauses.
 */
export function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Convert array of records to SQL VALUES clause.
 * Used for bulk inserts.
 *
 * Example:
 * toSQLValues([['123 MAIN', 'SW1A'], ['456 OAK', 'SW1B']])
 * → "('123 MAIN', 'SW1A'), ('456 OAK', 'SW1B')"
 */
export function toSQLValues(records: (string | number | boolean | null)[][]): string {
  return records
    .map(
      (row) =>
        `(${row
          .map((v) => {
            if (v === null) return 'NULL';
            if (typeof v === 'number') return v.toString();
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            return `'${escapeSQL(v.toString())}'`;
          })
          .join(', ')})`
    )
    .join(', ');
}
