import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendSignupNurtureDay3, sendSignupNurtureDay7, sendWelcomeEmail } from "@/lib/email";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_ENTRA_ID_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET,
      issuer: process.env.MICROSOFT_ENTRA_ID_TENANT_ID
        ? `https://login.microsoftonline.com/${process.env.MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`
        : "https://login.microsoftonline.com/common/v2.0",
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "RealHQ <noreply@realhq.com>",
    }),
    Credentials({
      credentials: { email: { type: "email" } },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        if (!email) return null;

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const isAdmin = email === (process.env.ADMIN_EMAIL ?? "hello@realhq.com");
          user = await prisma.user.create({
            data: { email, onboardedAt: new Date(), isAdmin },
          });
          sendWelcomeEmail({ name: email.split("@")[0], email }).catch((e) =>
            console.error("[auth] welcome email failed:", e)
          );
          const alreadyCaptured = await prisma.signupLead.findUnique({
            where: { email },
            select: { id: true },
          });
          if (!alreadyCaptured) {
            sendSignupNurtureDay3({ name: email.split("@")[0], email }).catch((e) =>
              console.error("[auth] day3 nurture failed:", e)
            );
            sendSignupNurtureDay7({ name: email.split("@")[0], email }).catch((e) =>
              console.error("[auth] day7 nurture failed:", e)
            );
          }
        }
        return user;
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin?verify=1",
    error: "/signin?error=1",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.portfolio = (user as { portfolio?: string | null }).portfolio;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.portfolio = token.portfolio as string | null | undefined;
      session.user.isAdmin = token.isAdmin as boolean | undefined;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // On first sign-up via magic link, onboardedAt is null — mark it now
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
      if (user.email) {
        const name = user.name ?? user.email.split("@")[0];

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
