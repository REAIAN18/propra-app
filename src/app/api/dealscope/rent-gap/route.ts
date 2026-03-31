import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { analyzeRentGap } from '@/lib/dealscope-rent-gap'
import type { PropertyEnrichmentData } from '@/lib/dealscope-types'

export const runtime = 'nodejs'

// Demo data for unauthenticated users
const DEMO_RENT_GAPS = [
  {
    address: '1 Canada Square, London E14 5AB',
    current_rent_monthly: 4500,
    market_rent_monthly: 4200,
    property_data: {
      epc_rating: 'B',
      building_age_years: 15,
      occupancy_rate: 95,
      tenant_strength: 'Strong',
    },
  },
  {
    address: '42 Kensington Palace Gardens, London W8 4QP',
    current_rent_monthly: 8000,
    market_rent_monthly: 8200,
    property_data: {
      epc_rating: 'C',
      building_age_years: 85,
      occupancy_rate: 88,
      tenant_strength: 'Strong',
    },
  },
  {
    address: '10 Downing Street, London SW1A 2AA',
    current_rent_monthly: 5500,
    market_rent_monthly: 6200,
    property_data: {
      epc_rating: 'D',
      building_age_years: 300,
      occupancy_rate: 75,
      tenant_strength: 'Moderate',
    },
  },
]

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Check authentication
    if (!session?.user?.id) {
      // Return demo data for unauthenticated requests
      const demoIndex = Math.floor(Math.random() * DEMO_RENT_GAPS.length)
      const demo = DEMO_RENT_GAPS[demoIndex]

      const analysis = await analyzeRentGap(
        demo.address,
        demo.current_rent_monthly,
        demo.market_rent_monthly,
        demo.property_data as Partial<PropertyEnrichmentData>
      )

      return NextResponse.json(
        {
          success: true,
          data: analysis,
          demo: true,
          address: demo.address,
        },
        { status: 200 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      address,
      current_rent_monthly,
      market_rent_monthly,
      property_data,
    } = body

    // Validate required fields
    if (!address || !current_rent_monthly || !market_rent_monthly) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: address, current_rent_monthly, market_rent_monthly',
        },
        { status: 400 }
      )
    }

    // Validate numeric fields
    if (typeof current_rent_monthly !== 'number' || typeof market_rent_monthly !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'current_rent_monthly and market_rent_monthly must be numbers',
        },
        { status: 400 }
      )
    }

    // Perform rent gap analysis
    const analysis = await analyzeRentGap(
      address,
      current_rent_monthly,
      market_rent_monthly,
      property_data
    )

    return NextResponse.json(
      {
        success: true,
        data: analysis,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error analyzing rent gap:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    // Return demo data by default
    const demoIndex = Math.floor(Math.random() * DEMO_RENT_GAPS.length)
    const demo = DEMO_RENT_GAPS[demoIndex]

    const analysis = await analyzeRentGap(
      demo.address,
      demo.current_rent_monthly,
      demo.market_rent_monthly,
      demo.property_data as Partial<PropertyEnrichmentData>
    )

    return NextResponse.json(
      {
        success: true,
        data: analysis,
        demo: !session?.user?.id,
        address: demo.address,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching rent gap demo:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
