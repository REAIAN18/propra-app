import { NextRequest, NextResponse } from "next/server"
import { parsePropertyUrl } from "@/lib/dealscope-url-parser"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const { url } = body

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "URL is required",
        },
        { status: 400 }
      )
    }

    // Parse the URL
    const parsedData = await parsePropertyUrl(url)

    return NextResponse.json(
      {
        success: true,
        data: parsedData,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error parsing URL:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to parse URL",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Support GET with URL in query string for testing
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: "URL query parameter is required",
      },
      { status: 400 }
    )
  }

  try {
    const parsedData = await parsePropertyUrl(url)

    return NextResponse.json(
      {
        success: true,
        data: parsedData,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error parsing URL:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to parse URL",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
