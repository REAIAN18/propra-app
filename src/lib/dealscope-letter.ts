import { Anthropic } from '@anthropic-ai/sdk'

export interface LetterGenerationRequest {
  propertyContext: {
    address: string
    propertyType?: string
    bedrooms?: number
    bathrooms?: number
    price?: number
    description?: string
  }
  ownerIntel?: {
    estimatedOwnerProfile?: string
    possibleReasons?: string
    marketConditions?: string
  }
  tone?: 'professional' | 'friendly' | 'formal' | 'casual'
  buyerProfile?: {
    name?: string
    company?: string
    background?: string
  }
}

export interface LetterGenerationResponse {
  success: boolean
  letter?: string
  letterHtml?: string
  metadata?: {
    tokenCount: number
    model: string
  }
  error?: string
}

/**
 * Generate a personalized property approach letter using Claude API
 */
export async function generateApproachLetter(request: LetterGenerationRequest): Promise<LetterGenerationResponse> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set')
    }

    const client = new Anthropic()

    // Build the prompt
    const prompt = buildLetterPrompt(request)

    // Call Claude API
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract the generated letter
    const letterContent = message.content[0]
    if (letterContent.type !== 'text') {
      throw new Error('Unexpected response format from Claude API')
    }

    const letter = letterContent.text

    // Convert to HTML for display
    const letterHtml = formatLetterAsHtml(letter)

    return {
      success: true,
      letter,
      letterHtml,
      metadata: {
        tokenCount: message.usage.input_tokens + message.usage.output_tokens,
        model: message.model,
      },
    }
  } catch (error) {
    console.error('Error generating approach letter:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating letter',
    }
  }
}

function buildLetterPrompt(request: LetterGenerationRequest): string {
  const { propertyContext, ownerIntel, tone = 'professional', buyerProfile } = request

  const toneGuide = {
    professional: 'professional, respectful, and business-like',
    friendly: 'warm, personable, and approachable',
    formal: 'formal, detailed, and comprehensive',
    casual: 'conversational, friendly, and straightforward',
  }[tone]

  return `You are an expert property investment consultant generating a personalized approach letter to a property owner.

Property Details:
- Address: ${propertyContext.address}
${propertyContext.propertyType ? `- Property Type: ${propertyContext.propertyType}` : ''}
${propertyContext.bedrooms ? `- Bedrooms: ${propertyContext.bedrooms}` : ''}
${propertyContext.bathrooms ? `- Bathrooms: ${propertyContext.bathrooms}` : ''}
${propertyContext.price ? `- Listed Price: £${propertyContext.price.toLocaleString()}` : ''}
${propertyContext.description ? `- Description: ${propertyContext.description}` : ''}

Owner Context:
${ownerIntel?.estimatedOwnerProfile ? `- Owner Profile: ${ownerIntel.estimatedOwnerProfile}` : ''}
${ownerIntel?.possibleReasons ? `- Possible Reasons for Sale: ${ownerIntel.possibleReasons}` : ''}
${ownerIntel?.marketConditions ? `- Market Context: ${ownerIntel.marketConditions}` : ''}

Buyer Details:
${buyerProfile?.name ? `- Name: ${buyerProfile.name}` : ''}
${buyerProfile?.company ? `- Company: ${buyerProfile.company}` : ''}
${buyerProfile?.background ? `- Background: ${buyerProfile.background}` : ''}

Generate a personalized approach letter that is:
1. ${toneGuide}
2. 200-300 words
3. Specific to this property and owner situation
4. Compelling but not pushy
5. Includes clear next steps

The letter should:
- Open with a personalized reference to the property
- Demonstrate understanding of the property and market
- Explain the buyer's genuine interest or investment thesis
- Make a specific proposition
- Include contact information
- Close professionally

Format the letter as a proper business letter with date, salutation, body paragraphs, and closing. Do not include a placeholder name - use "Dear Property Owner" or similar.`
}

function formatLetterAsHtml(letter: string): string {
  // Convert plain text letter to HTML
  const paragraphs = letter.split('\n\n').map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
  return `<div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
    ${paragraphs.join('')}
  </div>`
}
