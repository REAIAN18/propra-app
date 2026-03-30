/**
 * src/lib/dealscope-ccod.ts
 * CCOD (Companies Owning Property) lookups from Land Registry data.
 *
 * Finds companies that own a specific property or properties owned by a company.
 */

import { prisma } from '@/lib/prisma';

export interface OwnershipRecord {
  titleNumber: string;
  companyNumber: string;
  companyName: string;
  postcode: string;
}

/**
 * Find companies that own a property by postcode and address.
 *
 * @param address Full property address
 * @param postcode Property postcode
 * @returns Array of company ownership records for that property
 */
export async function findOwnersByAddress(
  address: string,
  postcode: string
): Promise<OwnershipRecord[]> {
  try {
    const results = await prisma.landRegistryCCOD.findMany({
      where: {
        postcode: {
          equals: postcode,
          mode: 'insensitive',
        },
        address: {
          contains: address,
          mode: 'insensitive',
        },
      },
      select: {
        titleNumber: true,
        companyNumber: true,
        companyName: true,
        postcode: true,
      },
      take: 5, // Limit to 5 ownership records
    });

    return results;
  } catch (error) {
    console.error('[dealscope-ccod] Error finding owners by address:', error);
    return [];
  }
}

/**
 * Find properties owned by a specific company.
 *
 * @param companyNumber Companies House company number
 * @param postcodeSector Optional postcode sector filter
 * @returns Array of properties owned by the company
 */
export async function findPropertiesByCompany(
  companyNumber: string,
  postcodeSector?: string
): Promise<OwnershipRecord[]> {
  try {
    const results = await prisma.landRegistryCCOD.findMany({
      where: {
        companyNumber: {
          equals: companyNumber,
          mode: 'insensitive',
        },
        postcodeSector: postcodeSector
          ? {
              equals: postcodeSector,
              mode: 'insensitive',
            }
          : undefined,
      },
      select: {
        titleNumber: true,
        companyNumber: true,
        companyName: true,
        postcode: true,
      },
      take: 50, // Limit to 50 properties
    });

    return results;
  } catch (error) {
    console.error('[dealscope-ccod] Error finding properties by company:', error);
    return [];
  }
}

/**
 * Get company details from first ownership record.
 * Useful for quick owner identification.
 */
export async function getCompanyOwner(
  address: string,
  postcode: string
): Promise<{ companyNumber: string; companyName: string } | null> {
  try {
    const ownership = await prisma.landRegistryCCOD.findFirst({
      where: {
        postcode: {
          equals: postcode,
          mode: 'insensitive',
        },
        address: {
          contains: address,
          mode: 'insensitive',
        },
      },
      select: {
        companyNumber: true,
        companyName: true,
      },
    });

    return ownership || null;
  } catch (error) {
    console.error('[dealscope-ccod] Error getting company owner:', error);
    return null;
  }
}
