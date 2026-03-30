import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

interface SendLetterRequest {
  letterId: string;
  method: 'email' | 'post';
  recipientEmail?: string;
  recipientAddress?: string;
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

    const body: SendLetterRequest = await req.json();
    const { letterId, method, recipientEmail, recipientAddress } = body;

    if (!letterId || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the letter
    const letter = await prisma.approachLetter.findUnique({
      where: { id: letterId },
      include: {
        deal: true,
      },
    });

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    if (letter.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (method === 'email') {
      if (!recipientEmail) {
        return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
      }

      // Send email using Resend
      try {
        await resend.emails.send({
          from: process.env.OUTREACH_EMAIL_FROM || 'noreply@realhq.app',
          to: recipientEmail,
          subject: `Investment Opportunity: ${letter.deal.address}`,
          html: `
            <div style="font-family: Georgia, serif; line-height: 1.6; color: #333; max-width: 600px;">
              ${letter.letterContent
                .split('\n\n')
                .map((para) => `<p>${para}</p>`)
                .join('')}
              <br/>
              <p style="font-size: 0.9em; color: #666;">
                This letter was sent via RealHQ.<br/>
                If you'd like to discuss this opportunity, please reply to this email.
              </p>
            </div>
          `,
        });

        // Update letter status
        await prisma.approachLetter.update({
          where: { id: letterId },
          data: {
            sentAt: new Date(),
            sentVia: 'email',
            recipientEmail,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Letter sent via email',
          sentVia: 'email',
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        return NextResponse.json(
          { error: 'Failed to send email', details: emailError instanceof Error ? emailError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } else if (method === 'post') {
      if (!recipientAddress) {
        return NextResponse.json({ error: 'Recipient address required' }, { status: 400 });
      }

      // For "post", we just mark it as ready for postal sending
      // In production, this would integrate with a postal service API
      await prisma.approachLetter.update({
        where: { id: letterId },
        data: {
          sentAt: new Date(),
          sentVia: 'post',
          recipientAddress,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Letter marked for postal delivery',
        sentVia: 'post',
        note: 'Letter content prepared for printing and mailing. In production, this would integrate with a postal service.',
      });
    }

    return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
  } catch (error) {
    console.error('Error sending approach letter:', error);
    return NextResponse.json(
      { error: 'Failed to send letter', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
