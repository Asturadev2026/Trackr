import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(_: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ count: 0 })

  try {
    const count = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    })

    return NextResponse.json({ count })
  } catch (e) {
    console.error("[notifications/count GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
