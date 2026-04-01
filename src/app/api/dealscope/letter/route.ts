import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { generateApproachLetter } from '@/lib/dealscope-letter'

export const runtime = 'nodejs'

// Demo letters for unauthenticated users
const DEMO_LETTERS = [
  {
    address: '1 Canada Square, London E14 5AB',
    letter: `Dear Property Owner,

I hope this letter finds you well. I am writing to express my interest in your property at 1 Canada Square, a stunning modern apartment in one of London's most sought-after addresses.

I am an experienced property investor with a strong track record in the Canary Wharf market. Your property stands out to me as an exceptional investment opportunity given its prime location, contemporary design, and strong rental yield potential in this vibrant commercial district.

I appreciate that selling a property is a significant decision. I would like to understand your timeline and circumstances better. Whether you are looking to sell immediately or exploring your options, I would welcome the opportunity to discuss how I might be able to help you achieve your goals.

I am confident I can offer you a straightforward transaction without the delays often associated with traditional estate agents. I am prepared to move quickly if we can agree on terms.

I would be delighted to meet with you at your convenience to discuss the property further. Please feel free to contact me at your earliest opportunity.

Yours sincerely,
A Property Investor`,
  },
  {
    address: '42 Kensington Palace Gardens, London W8 4QP',
    letter: `Dear Property Owner,

Thank you for considering my approach. Your property at 42 Kensington Palace Gardens represents everything I look for in a prime London residence.

I recognise this is an exceptional property with considerable character and historical significance. My interest stems from my genuine appreciation of this property's unique qualities and its position in one of London's most prestigious addresses.

I understand that discretion and a smooth process are likely important to you. I am a serious, experienced buyer who can provide certainty and a swift completion. I am prepared to discuss your requirements and work flexibly to achieve a solution that suits your circumstances.

I would very much appreciate the opportunity to view the property at a time convenient to you and to discuss my proposal in person. I am confident that once we meet, you will understand the sincerity of my interest.

I look forward to hearing from you.

With best regards,
A Property Buyer`,
  },
]

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Check authentication
    if (!session?.user?.id) {
      // Return demo letter for unauthenticated requests
      const demoIndex = Math.floor(Math.random() * DEMO_LETTERS.length)
      const demo = DEMO_LETTERS[demoIndex]

      return NextResponse.json(
        {
          success: true,
          data: {
            letter: demo.letter,
            demo: true,
            address: demo.address,
          },
        },
        { status: 200 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { propertyContext, ownerIntel, tone, buyerProfile } = body

    // Validate required fields
    if (!propertyContext?.address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: propertyContext.address',
        },
        { status: 400 }
      )
    }

    // Generate letter using Claude API
    const result = await generateApproachLetter({
      propertyContext,
      ownerIntel,
      tone,
      buyerProfile,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to generate letter',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          letter: result.letter,
          letterHtml: result.letterHtml,
          metadata: result.metadata,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in letter endpoint:', error)

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

    // Return demo letter by default
    const demoIndex = Math.floor(Math.random() * DEMO_LETTERS.length)
    const demo = DEMO_LETTERS[demoIndex]

    return NextResponse.json(
      {
        success: true,
        data: {
          letter: demo.letter,
          demo: !session?.user?.id,
          address: demo.address,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching letter demo:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
