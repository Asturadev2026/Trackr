import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

// Edge-compatible auth config (no Prisma, no bcrypt)
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Actual authorize logic is in lib/auth.ts (Node.js only)
      async authorize() {
        return null
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isPublicRoute = ["/login", "/forgot-password", "/reset-password"].includes(nextUrl.pathname)
      if (isLoggedIn && isPublicRoute) return Response.redirect(new URL("/dashboard", nextUrl))
      if (!isLoggedIn && !isPublicRoute) return false
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}
