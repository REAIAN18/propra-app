import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendSignupNurtureDay3, sendSignupNurtureDay7 } from "@/lib/email";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "Arca <noreply@arca.ai>",
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
      // @ts-expect-error — custom fields added to User
      session.user.portfolio = user.portfolio;
      // @ts-expect-error — custom fields added to User
      session.user.isAdmin = user.isAdmin;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // On first sign-up, onboardedAt is null — mark it now
      // Also auto-grant isAdmin if email matches ADMIN_EMAIL env var
      if (!user.id) return;
      const isAdmin =
        user.email === (process.env.ADMIN_EMAIL ?? "hello@arcahq.ai");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          onboardedAt: new Date(),
          isAdmin,
        },
      });

      // Signup nurture sequence — fire-and-forget (scheduledAt requires Resend Pro)
      if (user.email) {
        const name = user.name ?? user.email.split("@")[0];
        sendSignupNurtureDay3({ name, email: user.email }).catch((e) =>
          console.error("[auth] day3 nurture failed:", e)
        );
        sendSignupNurtureDay7({ name, email: user.email }).catch((e) =>
          console.error("[auth] day7 nurture failed:", e)
        );
      }
    },
  },
});
