import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(_: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ count: 0 })

  const count = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  })

  return NextResponse.json({ count })
}
