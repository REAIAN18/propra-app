export interface ParsedPropertyData {
  address: string
  postcode: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  price: number | null
  price_per_sqft: number | null
  description: string | null
  source: 'rightmove' | 'zoopla' | 'loopnet' | 'generic' | 'unknown'
  source_url: string
  property_url: string | null
}

/**
 * Parse real estate listing pages from various sources using basic HTML parsing
 * Supports: Rightmove, Zoopla, LoopNet, and generic agent pages
 */
export async function parsePropertyUrl(url: string): Promise<ParsedPropertyData> {
  try {
    // Fetch the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()

    // Determine source based on URL
    let source: ParsedPropertyData['source'] = 'unknown'
    if (url.includes('rightmove.co.uk')) {
      source = 'rightmove'
    } else if (url.includes('zoopla.co.uk')) {
      source = 'zoopla'
    } else if (url.includes('loopnet.com')) {
      source = 'loopnet'
    } else {
      source = 'generic'
    }

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1] : ''

    // Extract OG title
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)
    const ogTitle = ogTitleMatch ? ogTitleMatch[1] : ''

    // Try to find address in common locations
    const address = ogTitle || title.split('|')[0].trim()

    // Extract postcode using regex
    const postcodeMatch = address.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}|\d{5})/i)
    const postcode = postcodeMatch ? postcodeMatch[1] : null

    // Try to find price
    let price: number | null = null
    const priceMatch = html.match(/£?\s*([\d,]+)(?:,\d{3})?(?:\s*(?:p\.c|per month|pcm))?/i)
    if (priceMatch) {
      price = parseInt(priceMatch[1].replace(/,/g, ''), 10)
    }

    // Extract bedrooms
    let bedrooms: number | null = null
    const bedroomMatch = address.match(/(\d+)\s*bed/i) || html.match(/(\d+)\s*bed[a-z]*\s*/i)
    if (bedroomMatch) {
      bedrooms = parseInt(bedroomMatch[1], 10)
    }

    // Extract bathrooms
    let bathrooms: number | null = null
    const bathroomMatch = html.match(/(\d+)\s*bath[a-z]*\s*/i)
    if (bathroomMatch) {
      bathrooms = parseInt(bathroomMatch[1], 10)
    }

    // Extract description
    let description: string | null = null
    const descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)
    if (descriptionMatch) {
      description = descriptionMatch[1]
    }

    return {
      address: address || 'Unknown Address',
      postcode,
      property_type: null,
      bedrooms,
      bathrooms,
      price,
      price_per_sqft: null,
      description,
      source,
      source_url: url,
      property_url: url,
    }
  } catch (error) {
    throw new Error(`Failed to parse URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
