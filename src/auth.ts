import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendSignupNurtureDay3, sendSignupNurtureDay7, sendWelcomeEmail } from "@/lib/email";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "RealHQ <noreply@realhq.com>",
    }),
  ],
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin?verify=1",
    error: "/signin?error=1",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.portfolio = (user as { portfolio?: string | null }).portfolio;
      session.user.isAdmin = (user as { isAdmin?: boolean }).isAdmin;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // On first sign-up, onboardedAt is null — mark it now
      // Also auto-grant isAdmin if email matches ADMIN_EMAIL env var
      if (!user.id) return;
      const isAdmin =
        user.email === (process.env.ADMIN_EMAIL ?? "hello@realhq.com");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          onboardedAt: new Date(),
          isAdmin,
        },
      });

      // Signup nurture sequence + welcome email
      // Only send nurture if NOT already captured via /signup form
      // (the /api/signup route already sends these for SignupLead captures to avoid duplicates)
      if (user.email) {
        const name = user.name ?? user.email.split("@")[0];

        // Always send immediate welcome email on sign-up
        sendWelcomeEmail({ name, email: user.email }).catch((e) =>
          console.error("[auth] welcome email failed:", e)
        );

        const alreadyCaptured = await prisma.signupLead.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true },
        });
        if (!alreadyCaptured) {
          sendSignupNurtureDay3({ name, email: user.email }).catch((e) =>
            console.error("[auth] day3 nurture failed:", e)
          );
          sendSignupNurtureDay7({ name, email: user.email }).catch((e) =>
            console.error("[auth] day7 nurture failed:", e)
          );
        }
      }
    },
  },
});
