import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { calculateValueuations } from '@/lib/dealscope-valuations'
import type { PropertyEnrichmentData } from '@/lib/dealscope-types'

export const runtime = 'nodejs'

// Demo data for unauthenticated users
const DEMO_VALUATIONS = [
  {
    address: '1 Canada Square, London E14 5AB',
    propertyData: {
      occupancy_rate: 95,
      building_age_years: 15,
      epc_rating: 'B',
      comparable_sales: [
        { address: '2 Canada Square', price: 850000, price_psf: 280, transaction_date: '2026-03-15' },
        { address: '3 Canada Square', price: 920000, price_psf: 300, transaction_date: '2026-03-10' },
      ],
    },
    inputs: {
      annualRent: 48000,
      grossYield: 0.067,
      buildingSizeSqft: 3000,
      pricePerSqft: 290,
    },
  },
  {
    address: '42 Kensington Palace Gardens, London W8 4QP',
    propertyData: {
      occupancy_rate: 88,
      building_age_years: 85,
      epc_rating: 'C',
      comparable_sales: [],
    },
    inputs: {
      annualRent: 96000,
      grossYield: 0.06,
      buildingSizeSqft: 4000,
      pricePerSqft: 400,
    },
  },
]

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Check authentication
    if (!session?.user?.id) {
      // Return demo data for unauthenticated requests
      const demoIndex = Math.floor(Math.random() * DEMO_VALUATIONS.length)
      const demo = DEMO_VALUATIONS[demoIndex]

      const valuations = await calculateValueuations(
        demo.address,
        demo.propertyData as Partial<PropertyEnrichmentData>,
        demo.inputs
      )

      return NextResponse.json(
        {
          success: true,
          data: valuations,
          demo: true,
          address: demo.address,
        },
        { status: 200 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { address, propertyData, inputs } = body

    // Validate required fields
    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: address',
        },
        { status: 400 }
      )
    }

    // Calculate valuations
    const valuations = await calculateValueuations(address, propertyData, inputs)

    return NextResponse.json(
      {
        success: true,
        data: valuations,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error calculating valuations:', error)

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
    const demoIndex = Math.floor(Math.random() * DEMO_VALUATIONS.length)
    const demo = DEMO_VALUATIONS[demoIndex]

    const valuations = await calculateValueuations(
      demo.address,
      demo.propertyData as Partial<PropertyEnrichmentData>,
      demo.inputs
    )

    return NextResponse.json(
      {
        success: true,
        data: valuations,
        demo: !session?.user?.id,
        address: demo.address,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching valuations demo:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
