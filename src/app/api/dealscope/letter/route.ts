import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type Tone = 'formal' | 'direct' | 'consultative';

interface GenerateLetterRequest {
  dealId: string;
  tone: Tone;
  propertyAddress?: string;
  ownerName?: string;
  ownerCompany?: string;
  propertyType?: string;
  valuation?: number;
  opportunityThesis?: string;
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

    const body: GenerateLetterRequest = await req.json();
    const { dealId, tone, propertyAddress, ownerName, ownerCompany, propertyType, valuation, opportunityThesis } = body;

    if (!dealId || !tone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch deal details
    const deal = await prisma.scoutDeal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Determine tone-specific instructions
    const toneInstructions: Record<Tone, string> = {
      formal: 'Write in a formal, professional tone. Use traditional business language and maintain distance. Be respectful and diplomatic.',
      direct: 'Write in a direct, straightforward tone. Be concise and get to the point quickly. Use clear, no-nonsense language.',
      consultative: 'Write in a consultative, collaborative tone. Position yourself as a partner. Use warm, engaging language that invites dialogue.',
    };

    // Generate letter using Claude API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 });
    }

    const prompt = `You are writing an approach letter for a property investment opportunity.

Property Details:
- Address: ${propertyAddress || deal.address}
- Type: ${propertyType || deal.assetType}
- Asking Price: ${valuation ? `£${(valuation / 1000000).toFixed(1)}M` : deal.askingPrice ? `£${(deal.askingPrice / 1000000).toFixed(1)}M` : 'Market value'}

Owner/Recipient:
- Name: ${ownerName || 'Property Owner'}
- Company: ${ownerCompany || 'N/A'}

Investment Thesis:
${opportunityThesis || 'We are institutional property investors actively seeking acquisition opportunities in this area. Your property matches our investment criteria.'}

Tone: ${tone}
Instructions: ${toneInstructions[tone]}

Write a personalized approach letter (3-4 paragraphs) from a property investor to the owner. The letter should:
1. Introduce the investor briefly
2. Explain why this specific property is of interest
3. Highlight the investment thesis or opportunity
4. Invite a conversation or meeting
5. Be ${tone} in tone throughout

Do not include:
- Placeholder text like "[Your Name]" or "[Company]"
- Generic template language
- Overly aggressive language
- Specific price offers (keep it exploratory)

Return only the letter content, no subject line or additional commentary.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const letterContent = data?.content?.[0]?.text ?? '';

    // Save the generated letter
    const approachLetter = await prisma.approachLetter.create({
      data: {
        userId: user.id,
        dealId,
        letterContent,
        tone,
        recipientName: ownerName || null,
        recipientEmail: null,
        recipientAddress: null,
      },
    });

    return NextResponse.json({
      success: true,
      letterId: approachLetter.id,
      content: letterContent,
      tone,
    });
  } catch (error) {
    console.error('Error generating approach letter:', error);
    return NextResponse.json(
      { error: 'Failed to generate letter', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing letters for a deal
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get('dealId');

    if (!dealId) {
      return NextResponse.json({ error: 'Missing dealId' }, { status: 400 });
    }

    const letters = await prisma.approachLetter.findMany({
      where: {
        userId: user.id,
        dealId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ letters });
  } catch (error) {
    console.error('Error fetching approach letters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letters', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
