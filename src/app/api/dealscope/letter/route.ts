import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Anthropic } from '@anthropic-ai/sdk';
import { dealscopeCache } from '@/lib/dealscope-cache';

type Tone = 'formal' | 'direct' | 'consultative';

interface GenerateLetterRequest {
  // Database path: dealId + optional overrides
  dealId?: string;
  // Direct analysis path: property data without database lookup
  address?: string;
  assetType?: string;
  estValue?: number;
  passingRent?: number;
  marketERV?: number;
  // Common fields
  tone: Tone;
  ownerName?: string;
  ownerCompany?: string;
  opportunityThesis?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateLetterRequest = await req.json();
    const { tone, ownerName, ownerCompany, opportunityThesis } = body;

    if (!tone) {
      return NextResponse.json({ error: 'Missing tone' }, { status: 400 });
    }

    // Determine which path this is
    let propertyAddress: string | undefined;
    let propertyType: string | undefined;
    let valuation: number | undefined;
    let userId: string | undefined;
    let deal: any = null;

    if (body.dealId) {
      // Database path: requires authentication
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

      userId = user.id;

      deal = await prisma.scoutDeal.findUnique({
        where: { id: body.dealId },
      });

      if (!deal) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
      }

      propertyAddress = body.address || deal.address;
      propertyType = body.assetType || deal.assetType;
      valuation = body.estValue ?? deal.askingPrice;
    } else {
      // Direct analysis API path: no authentication required
      propertyAddress = body.address;
      propertyType = body.assetType;
      valuation = body.estValue;

      if (!propertyAddress) {
        return NextResponse.json({ error: 'Missing address or dealId' }, { status: 400 });
      }
    }

    // Check cache (only for analysis API path, not dealId path)
    let cacheKey: string | null = null;
    if (!body.dealId) {
      cacheKey = dealscopeCache.generateKey('letter', {
        propertyAddress,
        tone,
        ownerName,
        ownerCompany,
        opportunityThesis,
      });
      const cached = dealscopeCache.get<string>(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          letterText: cached,
          tone,
        });
      }
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
- Address: ${propertyAddress}
- Type: ${propertyType || 'Commercial'}
- Estimated Value: ${valuation ? `£${(valuation / 1000000).toFixed(1)}M` : 'Market value'}
- Current Rent: ${body.passingRent ? `£${(body.passingRent / 1000).toFixed(0)}k p.a.` : 'Not specified'}
- Market Rent: ${body.marketERV ? `£${(body.marketERV / 1000).toFixed(0)}k p.a.` : 'Not specified'}

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

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const letterContent = message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => (block.type === 'text' ? block.text : ''))
      .join('\n');

    // Cache result if this is the analysis API path
    if (cacheKey) {
      dealscopeCache.set(cacheKey, letterContent, 3600); // 1 hour TTL
    }

    // Save to database if this is the database path
    if (body.dealId && userId) {
      await prisma.approachLetter.create({
        data: {
          userId,
          dealId: body.dealId,
          letterContent,
          tone,
          recipientName: ownerName || null,
          recipientEmail: null,
          recipientAddress: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      letterText: letterContent,
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
