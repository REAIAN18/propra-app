/**
 * POST /api/dealscope/import/ccod
 * Import Land Registry CCOD (Companies Owning Property) CSV data.
 *
 * Accepts:
 * - CSV file upload (multipart form)
 * - CSV URL (application/json with { url: "..." })
 *
 * CSV Format (HM Land Registry CCOD standard):
 * Company Number,Company Name,Address,Postcode,Title Number,County
 * e.g. 01234567,"ACME HOLDINGS LTD","123 MAIN STREET","SW1A 1AA","ABC123456","LONDON"
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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

        const { companyNumber, companyName, address, postcode, titleNumber, county } = row;

        // Validate required fields
        if (!companyNumber || !companyName || !address || !postcode || !titleNumber) {
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
          titleNumber,
          companyNumber,
          companyName,
          address,
          postcode,
          postcodeSector,
          county: county || null,
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
        // Use row-by-row upsert for CCOD data (lower volume than price paid)
        for (const record of recordsToInsert) {
          try {
            await prisma.landRegistryCCOD.upsert({
              where: { id: `${record.titleNumber}_${record.companyNumber}` },
              update: record,
              create: {
                ...record,
                id: `${record.titleNumber}_${record.companyNumber}`,
              },
            });
            stats.imported++;
          } catch {
            stats.errors++;
          }
        }
      } catch (dbError) {
        console.error('Database insertion error:', dbError);
        return NextResponse.json(
          {
            error: 'Database insertion failed',
            details: dbError instanceof Error ? dbError.message : 'Unknown error',
            stats,
          },
          { status: 500 }
        );
      }
    }

    stats.duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Imported ${stats.imported}/${stats.totalRows} records`,
      stats,
    });
  } catch (error) {
    console.error('Error in CCOD import:', error);
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
 * CCOD format may have quoted company names.
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

  if (fields.length < 5) return null;

  return {
    companyNumber: fields[0],
    companyName: fields[1],
    address: fields[2],
    postcode: fields[3],
    titleNumber: fields[4],
    county: fields[5] || '',
  };
}
