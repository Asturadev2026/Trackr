import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createHash, randomBytes } from "crypto"

// GET — does the current user already have a key? (doesn't reveal it)
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { apiKey: true },
  })

  return NextResponse.json({ hasKey: !!user?.apiKey })
}

// POST — generate a new key (overwrites any existing one)
export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 32 random bytes → 64 hex chars, prefixed with "trk_" so it's recognisable
  const rawKey = "trk_" + randomBytes(32).toString("hex")

  // We only ever store the SHA-256 hash — the raw key is returned once and forgotten
  const hashedKey = createHash("sha256").update(rawKey).digest("hex")

  await prisma.user.update({
    where: { id: session.user.id },
    data: { apiKey: hashedKey },
  })

  // Return the raw key — this is the ONLY time it's visible
  return NextResponse.json({ key: rawKey })
}

// DELETE — revoke (clear) the key
export async function DELETE(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { apiKey: null },
  })

  return NextResponse.json({ success: true })
}
