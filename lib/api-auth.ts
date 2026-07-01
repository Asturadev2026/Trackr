/**
 * authenticate() — drop-in replacement for auth() across API routes.
 *
 * Two paths:
 *  1. Bearer token  →  SHA-256 hash the token, look up the matching user
 *                      in the DB via their stored apiKey hash.
 *                      This is how the remote MCP server (and any API client)
 *                      authenticates without a browser cookie.
 *
 *  2. No Bearer header  →  fall back to the normal NextAuth cookie session,
 *                          which is what every browser request uses today.
 *
 * Security note: we never store the raw key — only its SHA-256 hash.
 * Hashing the incoming token before the DB lookup means even if the DB is
 * compromised the attacker can't reverse the hashes back to real keys.
 */

import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createHash } from "crypto"

export async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    const rawToken = authHeader.slice(7)
    const hashedToken = createHash("sha256").update(rawToken).digest("hex")

    const user = await prisma.user.findUnique({
      where: { apiKey: hashedToken },
      select: { id: true, name: true, email: true, role: true },
    })

    if (user) return { user }

    // Token was provided but didn't match — reject immediately
    return null
  }

  // No Bearer header → normal NextAuth cookie session
  return await auth()
}
