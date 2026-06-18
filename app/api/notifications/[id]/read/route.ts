import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.notification.updateMany({
      where: { id: params.id, userId: session.user.id },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[notifications/[id]/read POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
