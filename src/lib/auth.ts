import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimitOperation, TooManyRequestsError } from "@/lib/security-throttle";
import { googleIdentityMatchesExistingAccount, isVerifiedGoogleIdentity } from "@/lib/google-account-link";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]).optional()
});

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      role: { label: "Role", type: "text" }
    },
    async authorize(credentials, request) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      // Limit all attempts (successful and failed) before bcrypt work.
      // NextAuth credentials requests expose request.headers.
      try {
        await rateLimitOperation(prisma, "login", parsed.data.email, request.headers);
      } catch (error) {
        if (error instanceof TooManyRequestsError) return null;
        throw error; // Fail closed when the throttle database is unavailable.
      }

      const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (!user?.passwordHash) return null;
      if (parsed.data.role && user.role !== parsed.data.role) return null;

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
    }
  })
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      // Google must have verified the email. Never enable automatic email
      // linking for users who are not already authenticated.
      if (!isVerifiedGoogleIdentity(profile)) return false;

      // NextAuth v4 supports explicit OAuth account linking when the user is
      // already signed in. Protect that feature against linking a *different*
      // Google email into an existing Eduva account.
      const requestCookies = (await cookies()).getAll();
      const hasSessionCookie = requestCookies.some(({ name }) =>
        /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(name),
      );
      const cookieHeader = requestCookies
        .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join("; ");
      const request = new NextRequest("https://eduva.invalid", {
        headers: { cookie: cookieHeader },
      });
      const signedInToken = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      // If a session cookie exists but cannot be verified, never let the
      // provider proceed with implicit account linking.
      if (hasSessionCookie && !signedInToken?.id) return false;
      if (signedInToken?.id) {
        const existing = await prisma.user.findUnique({
          where: { id: String(signedInToken.id) },
          select: { email: true },
        });
        if (!existing) return false;
        if (!googleIdentityMatchesExistingAccount(profile, existing.email)) {
          return "/account/link-google?error=GoogleEmailMismatch";
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const role = (user as { role?: string }).role;
        token.role = role === "ADMIN" ? "ADMIN" : role === "TEACHER" ? "TEACHER" : "STUDENT";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role === "ADMIN" ? "ADMIN" : token.role === "TEACHER" ? "TEACHER" : "STUDENT";
      }
      return session;
    }
  }
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  // Never authorize Server Components using a potentially stale JWT role.
  // A deleted user or a revoked admin/teacher must lose access immediately.
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, role: true },
  });
}
