import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    // Check if this property already exists
    let deal = await prisma.scoutDeal.findFirst({
      where: {
        address: {
          contains: address,
          mode: 'insensitive',
        },
        userId: user.id,
      },
      include: {
        approachLetters: true,
        comparables: true,
      },
    });

    // If not exists, create new ScoutDeal record
    if (!deal) {
      deal = await prisma.scoutDeal.create({
        data: {
          address,
          assetType: 'unknown', // Will be determined during enrichment
          sourceTag: 'DealScope',
          userId: user.id,
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

      // Fire off enrichment in the background
      // Note: enrichAsset expects a UserAsset, but we can adapt it for ScoutDeal
      // For now, we'll do a simplified enrichment inline
      try {
        // Geocode
        const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
        if (mapsKey) {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsKey}`,
            { signal: AbortSignal.timeout(5000) }
          );

          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const result = geoData?.results?.[0];

            if (result) {
              const location = result.geometry?.location;
              const addressComponents = result.address_components || [];

              // Determine country
              const countryComp = addressComponents.find((c: { types: string[] }) =>
                c.types.includes('country')
              );
              const country = countryComp?.short_name || 'UK';

              // Build satellite URL
              const satUrl = location ? `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=18&size=400x250&maptype=satellite&key=${mapsKey}` : null;

              // Update deal with geocoding results
              const updatedDeal = await prisma.scoutDeal.update({
                where: { id: deal.id },
                data: {
                  region: country === 'GB' ? 'se_uk' : 'fl_us',
                  satelliteImageUrl: satUrl,
                  enrichedAt: new Date(),
                  dataSources: { geocoding: 'google_maps' } as never, // Type assertion for JSON field
                },
                include: {
                  approachLetters: true,
                  comparables: true,
                },
              });

              // Update local reference
              deal = updatedDeal;
            }
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
