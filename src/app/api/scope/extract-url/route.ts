import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const url = body.url as string | undefined;

    if (!url) {
      return NextResponse.json(
        { error: "url is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch the listing page
    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: ${response.statusText}` },
          { status: 400 }
        );
      }

      html = await response.text();
    } catch (error) {
      return NextResponse.json(
        { error: "Could not fetch the URL" },
        { status: 400 }
      );
    }

    // Extract data from HTML
    const extracted = extractFromHTML(html, url);

    if (!extracted.address) {
      return NextResponse.json(
        {
          error: "Could not extract address from URL. Please provide it manually.",
          extracted,
        },
        { status: 400 }
      );
    }

    // Feed into enrichment
    return NextResponse.json({
      address: extracted.address,
      price: extracted.price,
      images: extracted.images,
      source: new URL(url).hostname,
      raw: extracted,
    });
  } catch (error) {
    console.error("Extract URL error:", error);
    return NextResponse.json(
      { error: "Failed to extract from URL" },
      { status: 500 }
    );
  }
}

function extractFromHTML(
  html: string,
  url: string
): {
  address?: string;
  price?: number;
  currency?: string;
  images: string[];
} {
  const result = {
    address: undefined as string | undefined,
    price: undefined as number | undefined,
    currency: "GBP",
    images: [] as string[],
  };

  // Common patterns to extract address
  const addressPatterns = [
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<title>([^<]+)<\/title>/i,
    /property["\s:]+([A-Za-z0-9\s,]+?(?:\d{1,2}\w{0,2}\s+[A-Z]{1,2}\d|[A-Z]{1,2}\d[A-Z]?\s+\d[A-Z]{2}))/i,
    /"address"["\s:]+["']?([^"'<>]+)["']?/i,
    /address["\s:]+["']?([^"'<>]+)["']?/i,
  ];

  for (const pattern of addressPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      // Filter out common false positives
      if (extracted.length > 5 && extracted.length < 200) {
        result.address = extracted;
        break;
      }
    }
  }

  // Extract price
  const pricePatterns = [
    /[£$]\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*[km]?/i,
    /"price"["\s:]+(\d+)/i,
    /price["\s:]+£(\d+)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const priceStr = match[1].replace(/,/g, "");
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) {
        result.price = price * (match[0].includes("k") ? 1000 : 1);
        break;
      }
    }
  }

  // Extract image URLs
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let imgMatch;
  const seenUrls = new Set<string>();

  while ((imgMatch = imgRegex.exec(html)) !== null) {
    let imgUrl = imgMatch[1];

    // Make absolute URLs
    if (imgUrl.startsWith("/")) {
      const baseUrl = new URL(url);
      imgUrl = `${baseUrl.protocol}//${baseUrl.host}${imgUrl}`;
    } else if (imgUrl.startsWith(".")) {
      const baseUrl = new URL(url);
      imgUrl = new URL(imgUrl, baseUrl.href).href;
    }

    // Filter out tracking pixels and duplicates
    if (
      !imgUrl.includes("tracker") &&
      !imgUrl.includes("pixel") &&
      !imgUrl.includes("ads") &&
      !seenUrls.has(imgUrl)
    ) {
      seenUrls.add(imgUrl);
      result.images.push(imgUrl);
    }
  }

  return result;
}
