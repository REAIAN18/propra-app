export interface ParsedPropertyData {
  address: string
  postcode: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  price: number | null
  price_per_sqft: number | null
  sqft: number | null
  description: string | null
  source: 'rightmove' | 'zoopla' | 'loopnet' | 'savills' | 'generic' | 'unknown'
  source_url: string
  property_url: string | null
  listing: ListingData | null
}

export interface ListingData {
  images: string[]
  floorplans: string[]
  features: string[]
  description: string | null
  tenure: string | null
  accommodation: string | null
  lotNumber: string | null
  auctionDate: string | null
  agentContact: { name?: string; phone?: string; email?: string } | null
  legalPackUrl: string | null
  ogImage: string | null
}

/**
 * Parse real estate listing pages from various sources using HTML scraping
 * Supports: Rightmove, Zoopla, Savills Auctions, LoopNet, and generic agent pages
 */
export async function parsePropertyUrl(url: string): Promise<ParsedPropertyData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()

    // Determine source based on URL
    let source: ParsedPropertyData['source'] = 'unknown'
    if (url.includes('savills.co.uk') || url.includes('savills.com')) {
      source = 'savills'
    } else if (url.includes('rightmove.co.uk')) {
      source = 'rightmove'
    } else if (url.includes('zoopla.co.uk')) {
      source = 'zoopla'
    } else if (url.includes('loopnet.com')) {
      source = 'loopnet'
    } else {
      source = 'generic'
    }

    // Extract basic meta data
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1] : ''

    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)
    const ogTitle = ogTitleMatch ? ogTitleMatch[1] : ''

    const address = cleanAddress(ogTitle || title.split('|')[0].trim())

    const postcodeMatch = address.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}|\d{5})/i)
    const postcode = postcodeMatch ? postcodeMatch[1] : null

    // Extract price — prefer guide/asking/reserve price patterns over random £ amounts
    let price: number | null = null
    const pricePatterns = [
      /(?:guide|asking|reserve|sale)\s*(?:price)?[:\s]*£\s*([\d,]+(?:\.\d{2})?)/i,
      /£\s*([\d,]+(?:\.\d{2})?)\s*(?:guide|freehold|leasehold)/i,
      /(?:price|value|offers?\s+(?:in\s+)?(?:excess|region))[:\s]*£\s*([\d,]+(?:\.\d{2})?)/i,
      /data-price="(\d+)"/i,
      /price["\s:]+(\d[\d,]+)/i,
    ]
    for (const pattern of pricePatterns) {
      const m = html.match(pattern)
      if (m) {
        const parsed = parseFloat(m[1].replace(/,/g, ''))
        if (!isNaN(parsed) && parsed >= 50000) { price = parsed; break }
      }
    }
    // Fallback: find largest £X,XXX,XXX amount (likely the property price, not a fee)
    if (!price) {
      const allPrices = [...html.matchAll(/£\s*([\d,]+)/g)]
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(v => !isNaN(v) && v >= 50000)
        .sort((a, b) => b - a)
      if (allPrices.length > 0) price = allPrices[0]
    }

    // Extract bedrooms / bathrooms
    let bedrooms: number | null = null
    const bedroomMatch = address.match(/(\d+)\s*bed/i) || html.match(/(\d+)\s*bed[a-z]*\s*/i)
    if (bedroomMatch) bedrooms = parseInt(bedroomMatch[1], 10)

    let bathrooms: number | null = null
    const bathroomMatch = html.match(/(\d+)\s*bath[a-z]*\s*/i)
    if (bathroomMatch) bathrooms = parseInt(bathroomMatch[1], 10)

    // Extract meta description (short)
    const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)
    const metaDesc = metaDescMatch ? metaDescMatch[1] : null

    // Extract size in sq ft
    let sqft: number | null = null
    const sizePatterns = [
      /(\d[\d,]*)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/gi,
      /(\d[\d,]*)\s*(?:sq\.?\s*m|sqm|square\s*met(?:re|er)s?)/gi,
    ]
    // sq ft patterns
    const sqftMatches = [...html.matchAll(sizePatterns[0])]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(v => !isNaN(v) && v >= 100 && v <= 500000)
    if (sqftMatches.length > 0) {
      // Take the most common or largest reasonable value
      sqft = sqftMatches.sort((a, b) => b - a)[0]
    }
    // sq m patterns — convert to sq ft
    if (!sqft) {
      const sqmMatches = [...html.matchAll(sizePatterns[1])]
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(v => !isNaN(v) && v >= 10 && v <= 50000)
      if (sqmMatches.length > 0) {
        sqft = Math.round(sqmMatches.sort((a, b) => b - a)[0] * 10.764)
      }
    }

    // Deep scrape listing data
    const listing = scrapeListingData(html, url, source)

    // Calculate price per sqft if both available
    const price_per_sqft = (price && sqft) ? Math.round(price / sqft) : null

    return {
      address: address || 'Unknown Address',
      postcode,
      property_type: null,
      bedrooms,
      bathrooms,
      price,
      price_per_sqft,
      sqft,
      description: listing?.description || metaDesc,
      source,
      source_url: url,
      property_url: url,
      listing,
    }
  } catch (error) {
    throw new Error(`Failed to parse URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function cleanAddress(raw: string): string {
  let clean = raw
    // Remove everything after pipe/dash separators (site names)
    .replace(/\s*[|\u2013\u2014]\s*(Savills|Rightmove|Zoopla|LoopNet|Allsop|Strettons|EIG|Acuitus|RIB|Commercial|Property).*$/i, '')
    .replace(/\|.*$/, '')
    .replace(/- (Rightmove|Zoopla|LoopNet|Allsop|Strettons|RIB).*$/i, '')
    // Remove auction house prefixes
    .replace(/^(Savills|Allsop|Strettons|Acuitus|EIG|RIB)\s*[-:|]\s*/i, '')
    // Remove "for sale" / "to let" suffixes
    .replace(/\s*(for sale|to let|to rent|commercial property|investment overview).*$/i, '')
    // Remove lot numbers from address
    .replace(/\s*,?\s*Lot\s*\d+/i, '')
    .trim()
  // If what remains looks like a description rather than an address, try to extract postcode-containing portion
  if (clean.length > 120 || !/\d/.test(clean)) {
    const postcodeChunk = clean.match(/[\w\s,'-]+[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i)
    if (postcodeChunk) clean = postcodeChunk[0].trim()
  }
  return clean
}

/**
 * Deep scrape listing data from HTML
 */
function scrapeListingData(html: string, url: string, source: string): ListingData {
  const listing: ListingData = {
    images: [],
    floorplans: [],
    features: [],
    description: null,
    tenure: null,
    accommodation: null,
    lotNumber: null,
    auctionDate: null,
    agentContact: null,
    legalPackUrl: null,
    ogImage: null,
  }

  // ── og:image ──
  const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
  if (ogImageMatch) listing.ogImage = ogImageMatch[1]

  // ── ALL IMAGES ──
  // Gallery / carousel images — match all <img> tags and filter for property photos
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi
  let imgMatch
  const seenImages = new Set<string>()
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const src = imgMatch[1]
    // Skip tiny images (icons, logos, tracking pixels)
    const isIcon = /\b(icon|logo|favicon|pixel|tracking|badge|sprite|avatar)\b/i.test(src)
    const isTiny = /(?:w|width)[=_](?:[1-9]\d?|1[0-4]\d)(?:\D|$)/.test(src)
    // Keep property photos — common patterns for listing sites
    const isProperty = /(?:property|listing|auction|image|photo|gallery|media|cdn|upload|img\.savills|savills\.com\/\w+_images|lc\.zoocdn|media\.rightmove)/i.test(src)
    const isLargeImg = /(?:w|width)[=_](?:[3-9]\d{2}|\d{4,})/i.test(src)

    if (!isIcon && !isTiny && (isProperty || isLargeImg || src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))) {
      const fullUrl = resolveUrl(src, url)
      if (fullUrl && !seenImages.has(fullUrl)) {
        seenImages.add(fullUrl)
        listing.images.push(fullUrl)
      }
    }
  }

  // Also check for images in data attributes (lazy-loaded galleries)
  const dataSrcRegex = /data-(?:src|original|lazy|image)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
  let dataSrcMatch
  while ((dataSrcMatch = dataSrcRegex.exec(html)) !== null) {
    const fullUrl = resolveUrl(dataSrcMatch[1], url)
    if (fullUrl && !seenImages.has(fullUrl)) {
      seenImages.add(fullUrl)
      listing.images.push(fullUrl)
    }
  }

  // Check srcset for high-res images
  const srcsetRegex = /srcset="([^"]+)"/gi
  let srcsetMatch
  while ((srcsetMatch = srcsetRegex.exec(html)) !== null) {
    const entries = srcsetMatch[1].split(',')
    // Take the largest image from each srcset
    const last = entries[entries.length - 1]?.trim().split(/\s+/)[0]
    if (last && (last.includes('.jpg') || last.includes('.jpeg') || last.includes('.png') || last.includes('.webp'))) {
      const fullUrl = resolveUrl(last, url)
      if (fullUrl && !seenImages.has(fullUrl)) {
        seenImages.add(fullUrl)
        listing.images.push(fullUrl)
      }
    }
  }

  // ── FLOORPLANS & LEGAL PACKS (PDF links) ──
  const pdfLinkRegex = /<a[^>]+href="([^"]+\.pdf[^"]*)"/gi
  let pdfMatch
  while ((pdfMatch = pdfLinkRegex.exec(html)) !== null) {
    const pdfUrl = resolveUrl(pdfMatch[1], url)
    if (!pdfUrl) continue

    const surroundingText = html.substring(
      Math.max(0, pdfMatch.index - 200),
      Math.min(html.length, pdfMatch.index + pdfMatch[0].length + 200)
    ).toLowerCase()

    if (/legal\s*pack|solicitor|pack\s*download/i.test(surroundingText)) {
      listing.legalPackUrl = pdfUrl
    } else if (/floor\s*plan|floorplan/i.test(surroundingText)) {
      listing.floorplans.push(pdfUrl)
    } else {
      // Default: assume floorplan if not identified
      listing.floorplans.push(pdfUrl)
    }
  }

  // ── KEY FEATURES ──
  // Look for feature lists — typically <ul> with <li> items near "features" or "key"
  // Strategy: find all <li> items that appear within feature-like sections
  const featureBlockRegex = /(?:key\s*features|features|highlights|key\s*points)[^<]*<\/[^>]+>\s*(?:<[^>]+>\s*)*<ul[^>]*>([\s\S]*?)<\/ul>/gi
  let featureBlockMatch
  while ((featureBlockMatch = featureBlockRegex.exec(html)) !== null) {
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
    let liMatch
    while ((liMatch = liRegex.exec(featureBlockMatch[1])) !== null) {
      const text = stripHtml(liMatch[1]).trim()
      if (text.length > 2 && text.length < 500) {
        listing.features.push(text)
      }
    }
  }

  // Fallback: look for <li> inside any section with class containing "feature"
  if (listing.features.length === 0) {
    const featureClassRegex = /class="[^"]*feature[^"]*"[^>]*>([\s\S]*?)<\/(?:ul|div|section)>/gi
    let fcMatch
    while ((fcMatch = featureClassRegex.exec(html)) !== null) {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
      let liMatch
      while ((liMatch = liRegex.exec(fcMatch[1])) !== null) {
        const text = stripHtml(liMatch[1]).trim()
        if (text.length > 2 && text.length < 500) {
          listing.features.push(text)
        }
      }
    }
  }

  // ── FULL DESCRIPTION ──
  // Look for description sections
  const descPatterns = [
    /(?:class="[^"]*(?:description|desc|property-description|lot-description|detail)[^"]*"[^>]*>)([\s\S]*?)<\/(?:div|section|article)>/gi,
    /(?:id="[^"]*(?:description|desc)[^"]*"[^>]*>)([\s\S]*?)<\/(?:div|section|article)>/gi,
    /<h[2-4][^>]*>[^<]*(?:description|about this property|about this lot|lot details)[^<]*<\/h[2-4]>\s*([\s\S]*?)(?=<h[2-4]|<\/section|<\/article)/gi,
  ]

  for (const pattern of descPatterns) {
    const match = pattern.exec(html)
    if (match) {
      const text = stripHtml(match[1]).trim()
      if (text.length > 50) {
        listing.description = text.slice(0, 5000) // Cap at 5000 chars
        break
      }
    }
  }

  // Fallback to <p> tags that look like descriptions (filter navigation/boilerplate)
  if (!listing.description) {
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
    const paragraphs: string[] = []
    let pMatch
    while ((pMatch = pRegex.exec(html)) !== null) {
      const text = stripHtml(pMatch[1]).trim()
      // Skip navigation, cookie banners, legal boilerplate, and short fragments
      if (text.length < 80) continue
      if (/\b(cookie|privacy policy|terms of use|sign up|log in|register|subscribe|newsletter|navigation|menu)\b/i.test(text)) continue
      if ((text.match(/\bhref\b/g) || []).length > 3) continue // Link-heavy = nav
      paragraphs.push(text)
    }
    if (paragraphs.length > 0) {
      listing.description = paragraphs.slice(0, 10).join('\n\n').slice(0, 5000)
    }
  }

  // Final description cleanup — strip residual nav/boilerplate from extracted text
  if (listing.description) {
    const lines = listing.description.split('\n').filter(line => {
      const t = line.trim()
      if (!t) return false
      // Remove lines that look like nav items (very short with action words)
      if (t.length < 20 && /^(home|search|contact|about|login|sign|menu|back|next|prev)/i.test(t)) return false
      return true
    })
    listing.description = lines.join('\n').trim() || null
  }

  // ── TENURE ──
  const tenureMatch = html.match(/(?:tenure|tenancy)[^<]*?(?:<[^>]*>)?\s*:?\s*(?:<[^>]*>)?\s*(freehold|leasehold|share\s*of\s*freehold|commonhold)/i)
  if (tenureMatch) {
    listing.tenure = tenureMatch[1].trim()
    listing.tenure = listing.tenure.charAt(0).toUpperCase() + listing.tenure.slice(1).toLowerCase()
  }

  // Also check for tenure in a structured data / table pattern
  if (!listing.tenure) {
    const tenureTableMatch = html.match(/<t[dh][^>]*>[^<]*tenure[^<]*<\/t[dh]>\s*<t[dh][^>]*>\s*([^<]+)/i)
    if (tenureTableMatch) {
      listing.tenure = tenureTableMatch[1].trim()
    }
  }

  // ── ACCOMMODATION ──
  const accomPatterns = [
    /(?:accommodation|additional\s*information|specification)[^<]*<\/[^>]+>\s*(?:<[^>]+>\s*)*([\s\S]*?)(?=<h[2-4]|<\/section|<\/article)/gi,
    /class="[^"]*(?:accommodation|additional)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/gi,
  ]

  for (const pattern of accomPatterns) {
    const match = pattern.exec(html)
    if (match) {
      const text = stripHtml(match[1]).trim()
      if (text.length > 20) {
        listing.accommodation = text.slice(0, 3000)
        break
      }
    }
  }

  // ── AUCTION DATE & LOT NUMBER ──
  // Lot number
  const lotMatch = html.match(/(?:lot\s*(?:number|no\.?|#)?)\s*:?\s*(\d{1,5})/i)
  if (lotMatch) listing.lotNumber = lotMatch[1]

  // Auction date — look for date patterns near "auction" text
  const auctionDatePatterns = [
    /auction[^<]{0,100}?(\d{1,2}\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{4})/i,
    /(\d{1,2}\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{4})[^<]{0,100}?auction/i,
    /(?:auction|sale)\s*(?:date|on)[^<]{0,50}?(\d{4}-\d{2}-\d{2})/i,
  ]

  for (const pattern of auctionDatePatterns) {
    const match = pattern.exec(html)
    if (match) {
      listing.auctionDate = normalizeDate(match[1])
      break
    }
  }

  // Also try to extract from URL for Savills
  if (!listing.auctionDate && source === 'savills') {
    const urlDateMatch = url.match(/(\d{1,2})--?(\d{1,2})-([a-z]+)-(\d{4})/i)
    if (urlDateMatch) {
      const dateStr = `${urlDateMatch[1]} ${urlDateMatch[3]} ${urlDateMatch[4]}`
      listing.auctionDate = normalizeDate(dateStr)
    }
  }

  // ── AGENT CONTACT ──
  const contactSection = html.match(/(?:contact|agent|auctioneer|broker)[^<]{0,50}<\/[^>]+>([\s\S]{0,2000}?)(?=<\/(?:section|aside|footer|div\s*class))/i)
  if (contactSection) {
    const section = contactSection[1]
    const phoneMatch = section.match(/(?:tel|phone|call)[^<]*?(?:<[^>]*>)?\s*:?\s*(?:<[^>]*>)?\s*([\d\s+()-]{7,20})/i)
      || section.match(/(0\d{2,4}\s?\d{3,4}\s?\d{3,4})/i)
      || section.match(/(\+44[\d\s]{9,15})/i)
    const emailMatch = section.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
    const nameMatch = section.match(/(?:agent|contact|name)[^<]*?(?:<[^>]*>)?\s*:?\s*(?:<[^>]*>)?\s*([A-Z][a-z]+\s[A-Z][a-z]+)/i)

    if (phoneMatch || emailMatch || nameMatch) {
      listing.agentContact = {
        name: nameMatch?.[1]?.trim() || undefined,
        phone: phoneMatch?.[1]?.trim() || undefined,
        email: emailMatch?.[1]?.trim() || undefined,
      }
    }
  }

  return listing
}

function resolveUrl(src: string, baseUrl: string): string | null {
  try {
    if (src.startsWith('//')) return `https:${src}`
    if (src.startsWith('http')) return src
    const base = new URL(baseUrl)
    return new URL(src, base.origin).href
  } catch {
    return null
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch { /* ignore */ }
  return dateStr.trim()
}
