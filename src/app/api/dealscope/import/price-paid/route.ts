/**
 * POST /api/dealscope/import/price-paid
 * Import Land Registry Price Paid CSV data into database.
 *
 * Accepts:
 * - CSV file upload (multipart form)
 * - CSV URL (application/json with { url: "..." })
 *
 * CSV Format (HM Land Registry standard):
 * Transaction ID,Price,Transfer Date,Property Address,Postcode,Property Type,New Property
 * e.g. {FFAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA},175000,2022-03-01,"123 MAIN STREET","SW1A 1AA","Terraced property",N
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { parseCSVData } from '@/lib/csv-parser';

interface ImportRequest {
  url?: string;
  fileContent?: string;
  dryRun?: boolean;
}

interface ImportStats {
  totalRows: number;
  imported: number;
  skipped: number;
  errors: number;
  duration: number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Admin check: only allow authenticated users for now
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 401 }
      );
    }

    const contentType = req.headers.get('content-type');
    const startTime = Date.now();
    const stats: ImportStats = {
      totalRows: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      duration: 0,
    };

    let csvContent: string | null = null;

    // ── Handle JSON payload with URL ──────────────────────────────────────
    if (contentType?.includes('application/json')) {
      const body = (await req.json()) as ImportRequest;

      if (body.url) {
        try {
          const response = await fetch(body.url, {
            signal: AbortSignal.timeout(30000),
          });
          if (response.ok) {
            csvContent = await response.text();
          } else {
            return NextResponse.json(
              { error: `Failed to fetch CSV: ${response.status}` },
              { status: 400 }
            );
          }
        } catch (error) {
          return NextResponse.json(
            { error: `Failed to download CSV: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 400 }
          );
        }
      } else if (body.fileContent) {
        csvContent = body.fileContent;
      }
    }
    // ── Handle multipart form upload ──────────────────────────────────────
    else if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      csvContent = await file.text();
    }

    if (!csvContent) {
      return NextResponse.json(
        { error: 'No CSV content provided' },
        { status: 400 }
      );
    }

    // ── Parse CSV and validate format ────────────────────────────────────
    const lines = csvContent.split('\n').map((line) => line.trim()).filter((line) => line);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file is empty or invalid' },
        { status: 400 }
      );
    }

    // Process rows
    const recordsToInsert = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const row = parseCSVLine(lines[i]);
        if (!row) {
          stats.skipped++;
          continue;
        }

        const {
          transactionId,
          price,
          transferDate,
          address,
          postcode,
          propertyType,
          isNew,
        } = row;

        // Validate required fields
        if (!transactionId || !price || !transferDate || !address || !postcode || !propertyType) {
          stats.skipped++;
          continue;
        }

        // Extract postcode sector (e.g., "SW1A" from "SW1A 1AA")
        const postcodeSector = postcode.match(/^[A-Z]{1,2}\d{1,2}[A-Z]?/)?.[0] || '';

        if (!postcodeSector) {
          stats.skipped++;
          continue;
        }

        recordsToInsert.push({
          transactionId,
          price: parseFloat(price),
          transferDate: new Date(transferDate),
          address,
          postcode,
          postcodeSector,
          propertyType,
          isNew: isNew.toUpperCase() === 'Y',
          source: 'land_registry',
          importedAt: new Date(),
          updatedAt: new Date(),
        });

        stats.totalRows++;
      } catch (error) {
        console.error(`Error parsing row ${i}:`, error);
        stats.errors++;
      }
    }

    if (recordsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'No valid records found in CSV', stats },
        { status: 400 }
      );
    }

    // ── Bulk insert using raw SQL for performance ────────────────────────
    if (!req.headers.get('x-dry-run')) {
      try {
        // Use Prisma raw insert for better performance
        const insertQuery = buildInsertQuery(recordsToInsert);
        await prisma.$executeRawUnsafe(insertQuery);
        stats.imported = recordsToInsert.length;
      } catch (dbError) {
        console.error('Database insertion error:', dbError);
        // Fallback: try row-by-row upsert
        for (const record of recordsToInsert) {
          try {
            await prisma.landRegistryPricePaid.upsert({
              where: { transactionId: record.transactionId },
              update: record,
              create: record,
            });
            stats.imported++;
          } catch {
            stats.errors++;
          }
        }
      }
    }

    stats.duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Imported ${stats.imported}/${stats.totalRows} records`,
      stats,
    });
  } catch (error) {
    console.error('Error in price-paid import:', error);
    return NextResponse.json(
      {
        error: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Parse a CSV line handling quoted fields.
 * Land Registry format may have quoted addresses with commas.
 */
function parseCSVLine(line: string): Record<string, string> | null {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.replace(/^"|"$/g, ''));

  if (fields.length < 7) return null;

  return {
    transactionId: fields[0],
    price: fields[1],
    transferDate: fields[2],
    address: fields[3],
    postcode: fields[4],
    propertyType: fields[5],
    isNew: fields[6],
  };
}

/**
 * Build bulk INSERT query for performance.
 * Prisma raw queries are faster than ORM for large inserts.
 */
function buildInsertQuery(records: Array<{
  transactionId: string;
  price: number;
  transferDate: Date;
  address: string;
  postcode: string;
  postcodeSector: string;
  propertyType: string;
  isNew: boolean;
  source: string;
  importedAt: Date;
  updatedAt: Date;
}>): string {
  const values = records
    .map(
      (r) =>
        `('${escape(r.transactionId)}', ${r.price}, '${r.transferDate.toISOString()}', '${escape(r.address)}', '${escape(r.postcode)}', '${escape(r.postcodeSector)}', '${escape(r.propertyType)}', ${r.isNew}, null, null, null, '${r.source}', '${r.importedAt.toISOString()}', '${r.updatedAt.toISOString()}', gen_random_uuid())`
    )
    .join(',');

  return `INSERT INTO "LandRegistryPricePaid" ("transactionId", "price", "transferDate", "address", "postcode", "postcodeSector", "propertyType", "isNew", "lat", "lng", "sqft", "source", "importedAt", "updatedAt", "id") VALUES ${values} ON CONFLICT ("transactionId") DO UPDATE SET "price" = EXCLUDED."price", "updatedAt" = EXCLUDED."updatedAt"`;
}

/**
 * Escape single quotes for SQL.
 */
function escape(str: string): string {
  return str.replace(/'/g, "''");
}
