/**
 * POST /api/dealscope/test/import-sample
 * Test endpoint for seeding sample Land Registry data.
 * Used for testing the enrich pipeline without waiting for real bulk imports.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Sample data for testing (UK property sales)
    const samplePricePaid = [
      {
        transactionId: 'test-001',
        price: 450000,
        transferDate: new Date('2023-01-15'),
        address: '123 MAIN STREET',
        postcode: 'SW1A 1AA',
        postcodeSector: 'SW1A',
        propertyType: 'Terraced property',
        isNew: false,
        lat: 51.503,
        lng: -0.1276,
        sqft: 2400,
      },
      {
        transactionId: 'test-002',
        price: 475000,
        transferDate: new Date('2023-06-20'),
        address: '125 MAIN STREET',
        postcode: 'SW1A 1AA',
        postcodeSector: 'SW1A',
        propertyType: 'Terraced property',
        isNew: false,
        lat: 51.5035,
        lng: -0.1278,
        sqft: 2350,
      },
      {
        transactionId: 'test-003',
        price: 495000,
        transferDate: new Date('2024-02-10'),
        address: '127 MAIN STREET',
        postcode: 'SW1A 1AA',
        postcodeSector: 'SW1A',
        propertyType: 'Terraced property',
        isNew: false,
        lat: 51.504,
        lng: -0.1280,
        sqft: 2500,
      },
      {
        transactionId: 'test-004',
        price: 520000,
        transferDate: new Date('2024-09-05'),
        address: '129 MAIN STREET',
        postcode: 'SW1A 1AA',
        postcodeSector: 'SW1A',
        propertyType: 'Terraced property',
        isNew: false,
        lat: 51.5045,
        lng: -0.1282,
        sqft: 2600,
      },
    ];

    const sampleCCOD = [
      {
        titleNumber: 'TN001',
        companyNumber: '01234567',
        companyName: 'ACME HOLDINGS LTD',
        address: '123 MAIN STREET',
        postcode: 'SW1A 1AA',
        postcodeSector: 'SW1A',
        county: 'LONDON',
      },
      {
        titleNumber: 'TN002',
        companyNumber: '02345678',
        companyName: 'PROPERTY MANAGEMENT PLC',
        address: '125 MAIN STREET',
        postcode: 'SW1A 1AA',
        postcodeSector: 'SW1A',
        county: 'LONDON',
      },
    ];

    // Insert sample price paid data
    await Promise.all(
      samplePricePaid.map((record) =>
        prisma.landRegistryPricePaid.upsert({
          where: { transactionId: record.transactionId },
          update: record,
          create: { ...record, source: 'land_registry' },
        })
      )
    );

    // Insert sample CCOD data
    await Promise.all(
      sampleCCOD.map((record) =>
        prisma.landRegistryCCOD.upsert({
          where: { id: `${record.titleNumber}_${record.companyNumber}` },
          update: record,
          create: {
            ...record,
            id: `${record.titleNumber}_${record.companyNumber}`,
            source: 'land_registry',
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Sample data seeded',
      pricePaidCount: samplePricePaid.length,
      ccodCount: sampleCCOD.length,
      testAddress: '123 MAIN STREET',
      testPostcode: 'SW1A 1AA',
      note: 'Use these values to test the enrich endpoint',
    });
  } catch (error) {
    console.error('Error seeding sample data:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed sample data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
