import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
// Data source integrations (for current and future use in enrichment pipeline)
import { lookupEPCByAddress, scoreEPCRisk } from '@/lib/dealscope-epc';
import { findComps } from '@/lib/dealscope-comps';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CompanyProfile } from '@/lib/dealscope-companies-house';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  // Available for API endpoints and future enrichment steps
  getCompanyProfile,
  searchCompany,
  getCompanyCharges,
  getCompanyInsolvency,
  scoreCompanyDistress,
} from '@/lib/dealscope-companies-house';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { searchGazetteByCompanyName, scoreGazetteDistress } from '@/lib/dealscope-gazette';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { scoreCompsConfidence } from '@/lib/dealscope-comps';

/**
 * Parse year from EPC construction age band
 */
function parseYearFromAge(ageband: string): number | undefined {
  const lower = ageband.toLowerCase();
  if (lower.includes('1919') || lower.includes('pre-1919')) return 1900;
  if (lower.includes('1919-1960') || (lower.includes('1919') && lower.includes('1960'))) return 1940;
  if (lower.includes('1960-1990')) return 1975;
  if (lower.includes('1990-2000')) return 1995;
  if (lower.includes('2000-2007')) return 2004;
  if (lower.includes('2007')) return 2010;
  return undefined;
}

// Address extraction from text using simple patterns
function extractAddressFromText(text: string): string | null {
  // UK postcode pattern
  const ukPostcodeMatch = text.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i);
  if (ukPostcodeMatch) {
    // Try to get surrounding context (street name + postcode)
    const postcodeIndex = text.indexOf(ukPostcodeMatch[0]);
    const before = text.substring(Math.max(0, postcodeIndex - 100), postcodeIndex).trim();
    const words = before.split(/\s+/).slice(-8); // Get up to 8 words before postcode
    return `${words.join(' ')} ${ukPostcodeMatch[0]}`;
  }

  // US address pattern (number + street + city + state + zip)
  const usAddressMatch = text.match(/\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct)\b[^.]*?\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/i);
  if (usAddressMatch) {
    return usAddressMatch[0];
  }

  return null;
}

// Fetch and extract address from URL (basic scraping)
async function fetchAddressFromUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RealHQ/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Try to find address in common patterns
    // Look for schema.org structured data
    const schemaMatch = html.match(/"address":\s*{[^}]*"streetAddress":\s*"([^"]+)"[^}]*"postalCode":\s*"([^"]+)"/);
    if (schemaMatch) {
      return `${schemaMatch[1]} ${schemaMatch[2]}`;
    }

    // Look for meta tags
    const metaMatch = html.match(/<meta[^>]*property="og:street-address"[^>]*content="([^"]+)"/i);
    if (metaMatch) {
      return metaMatch[1];
    }

    // Fallback: extract any address-like pattern from visible text
    const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ');

    return extractAddressFromText(textContent);
  } catch (error) {
    console.error('Error fetching URL:', error);
    return null;
  }
}

// Extract address from PDF (requires AWS Textract or pdf-parse)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function extractAddressFromPdf(_fileBuffer: Buffer): Promise<string | null> {
  try {
    // TODO: Implement PDF parsing using AWS Textract (already available in src/lib/textract.ts)
    // For MVP, return null and handle via text input instead
    console.log('PDF parsing not yet implemented - use AWS Textract');
    return null;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return null;
  }
}

interface EnrichRequest {
  address?: string;
  text?: string;
  url?: string;
  file?: string; // Base64 encoded PDF
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // Get user if authenticated (demo mode allows unauthenticated access)
    let userId: string | null = null;
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      userId = user?.id || null;
    }

    const body: EnrichRequest = await req.json();

    let address: string | null = null;
    let inputMethod: string = 'address';
    let inputRaw: unknown = null;

    // Determine input type and extract address
    if (body.address) {
      address = body.address;
      inputMethod = 'address';
      inputRaw = { address: body.address };
    } else if (body.text) {
      address = extractAddressFromText(body.text);
      inputMethod = 'text';
      inputRaw = { text: body.text };
    } else if (body.url) {
      address = await fetchAddressFromUrl(body.url);
      inputMethod = 'url';
      inputRaw = { url: body.url };
    } else if (body.file) {
      // Decode base64 PDF
      const fileBuffer = Buffer.from(body.file, 'base64');
      address = await extractAddressFromPdf(fileBuffer);
      inputMethod = 'pdf';
      inputRaw = { fileSize: fileBuffer.length };
    } else {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({
        error: 'Could not extract address from input',
        inputMethod
      }, { status: 400 });
    }

    // Check if this property already exists (only for authenticated users)
    let deal = userId ? await prisma.scoutDeal.findFirst({
      where: {
        address: {
          contains: address,
          mode: 'insensitive',
        },
        userId,
      },
      include: {
        approachLetters: true,
        comparables: true,
      },
    }) : null;

    // If not exists, create new ScoutDeal record
    if (!deal) {
      deal = await prisma.scoutDeal.create({
        data: {
          address,
          assetType: 'unknown', // Will be determined during enrichment
          sourceTag: 'DealScope',
          userId, // Can be null for demo mode
          inputMethod,
          inputRaw: inputRaw as never, // Type assertion for JSON field
          analyzedAt: new Date(),
          status: 'active',
          currency: 'GBP', // Default, adjust based on geocoding
        },
        include: {
          approachLetters: true,
          comparables: true,
        },
      });

      // Wire real data sources
      try {
        const enrichData: Record<string, unknown> = { geocoding: 'google_maps' };
        let isUK = true;
        let postcode: string | null = null;
        const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

        // Step 1: Geocode to get coordinates and confirm UK
        if (mapsKey) {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsKey}`,
            { signal: AbortSignal.timeout(5000) }
          );

          if (geoRes.ok) {
            const geoData = await geoRes.json() as Record<string, unknown>;
            const results = geoData?.results as Array<Record<string, unknown>> | undefined;
            const result = results?.[0];

            if (result) {
              const location = result.geometry as Record<string, unknown> | undefined;
              const addressComponents = (result.address_components || []) as Array<Record<string, unknown>>;

              // Determine country
              const countryComp = addressComponents.find((c: Record<string, unknown>) =>
                (c.types as string[] | undefined)?.includes('country')
              );
              const country = (countryComp?.short_name as string) || 'UK';
              isUK = country === 'GB' || country === 'UK';

              // Extract postcode
              const postcodeComp = addressComponents.find((c: Record<string, unknown>) =>
                (c.types as string[] | undefined)?.includes('postal_code')
              );
              if (postcodeComp) {
                postcode = postcodeComp.long_name as string;
              }

              // Build satellite URL
              const loc = location?.location as Record<string, unknown> | undefined;
              const satUrl = loc ? `https://maps.googleapis.com/maps/api/staticmap?center=${loc.lat},${loc.lng}&zoom=18&size=400x250&maptype=satellite&key=${mapsKey}` : null;

              deal = await prisma.scoutDeal.update({
                where: { id: deal.id },
                data: {
                  region: isUK ? 'se_uk' : 'fl_us',
                  satelliteImageUrl: satUrl || undefined,
                },
                include: {
                  approachLetters: true,
                  comparables: true,
                },
              });
            }
          }
        }

        // Only continue with UK data sources if property is in UK
        if (isUK && postcode) {
          // Step 2: EPC Data (floor area, energy rating, building type)
          const epc = await lookupEPCByAddress(address);
          if (epc) {
            enrichData.epc = 'opendatacommunities';
            // Calculate EPC risk score for future use
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const epcScore = scoreEPCRisk(epc);

            deal = await prisma.scoutDeal.update({
              where: { id: deal.id },
              data: {
                assetType: epc.buildingType || 'unknown',
                buildingSizeSqft: epc.floorAreaSqft || undefined,
                epcRating: epc.epcRating,
                yearBuilt: epc.constructionAge ? parseYearFromAge(epc.constructionAge) : undefined,
              },
              include: {
                approachLetters: true,
                comparables: true,
              },
            });
          }

          // Step 3: Comparable Sales (via Land Registry)
          const sqft = deal.buildingSizeSqft ?? undefined;
          const comps = await findComps(postcode, deal.assetType || 'unknown', sqft);
          if (comps.length > 0) {
            enrichData['land-registry'] = 'price-paid';
            // Don't deduct for comps - they're helpful context
          }

          // Step 4: Companies House Integration (owner company, directors, charges, insolvency)
          const companyDistressScore = 100;
          const companySignals: string[] = [];
          try {
            // Try to find owner company from CCOD (Land Registry CCOD data)
            // For now, we'll check if we can infer from address lookup
            // In production, integrate with CCOD bulk data

            // Search for companies by address pattern (simplified for MVP)
            // This is where CCOD integration would happen
            console.log(`[dealscope-enrich] Companies House lookup for ${address} (requires CCOD data)`);
          } catch (chError) {
            console.error('[dealscope-enrich] Companies House lookup error:', chError);
          }

          // Step 5: London Gazette Integration (insolvency notices)
          const gazetteDistressScore = 100;
          const gazetteSignals: string[] = [];
          try {
            // If we have an owner company name, search Gazette for insolvency notices
            // For now, this would be wired in when we have CCOD owner data
            console.log(`[dealscope-enrich] London Gazette lookup for property owner (requires owner company name)`);
          } catch (gazError) {
            console.error('[dealscope-enrich] Gazette lookup error:', gazError);
          }

          // Combine all distress scores
          const totalDistressScore = Math.round((companyDistressScore + gazetteDistressScore) / 2);
          const allSignals = [...companySignals, ...gazetteSignals].filter(s => s);

          // Store distress signals in enrichData
          if (allSignals.length > 0) {
            enrichData.distressSignals = allSignals;
            enrichData.distressScore = totalDistressScore;
          }

          // Save enrichment data and update
          const updated = await prisma.scoutDeal.update({
            where: { id: deal.id },
            data: {
              enrichedAt: new Date(),
              dataSources: enrichData as never,
            },
            include: {
              approachLetters: true,
              comparables: true,
            },
          });

          if (updated) {
            deal = updated;
          }
        }
      } catch (enrichError) {
        console.error('Error during enrichment:', enrichError);
        // Continue even if enrichment fails (graceful degradation)
      }
    }

    // Return the enriched property
    if (!deal) {
      return NextResponse.json({
        error: 'Failed to create or fetch property record'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      property: {
        id: deal.id,
        address: deal.address,
        assetType: deal.assetType,
        region: deal.region,
        satelliteImageUrl: deal.satelliteImageUrl,
        sqft: deal.sqft,
        askingPrice: deal.askingPrice,
        epcRating: deal.epcRating,
        yearBuilt: deal.yearBuilt,
        buildingSizeSqft: deal.buildingSizeSqft,
        ownerCompanyId: deal.ownerCompanyId,
        currentRentPsf: deal.currentRentPsf,
        marketRentPsf: deal.marketRentPsf,
        occupancyPct: deal.occupancyPct,
        enrichedAt: deal.enrichedAt,
        dataSources: deal.dataSources,
      },
      inputMethod,
      latency: Date.now(), // Track latency for monitoring
    });
  } catch (error) {
    console.error('Error in /api/dealscope/enrich:', error);
    return NextResponse.json(
      {
        error: 'Failed to enrich property',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
