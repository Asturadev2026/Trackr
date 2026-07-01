/**
 * authenticate() — drop-in replacement for auth() across API routes.
 *
 * How it works:
 *  1. If the request carries  Authorization: Bearer <MCP_API_KEY>  we trust it
 *     and load the user identified by  MCP_API_USER_EMAIL  from the database.
 *     This is the "service account" path used by the MCP server.
 *  2. Otherwise we fall back to the normal NextAuth cookie session — exactly
 *     what happens today for every browser request.
 *
 * Why keep two paths?  The website never sends a Bearer header, so the fallback
 * always fires for real users.  The MCP server never has a cookie, so it always
 * hits path 1.  The two flows never clash.
 */

import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7) // strip "Bearer "

    const apiKey   = process.env.MCP_API_KEY
    const apiEmail = process.env.MCP_API_USER_EMAIL

    // Both env vars must be set and the token must match
    if (apiKey && apiEmail && token === apiKey) {
      const user = await prisma.user.findUnique({
        where: { email: apiEmail },
        select: { id: true, name: true, email: true, role: true },
      })

      if (user) {
        // Return the same shape that auth() returns so callers need no changes
        return { user }
      }
    }

    // A Bearer token was sent but was invalid — reject immediately
    return null
  }

  // No Bearer header → normal NextAuth cookie session
  return await auth()
}
