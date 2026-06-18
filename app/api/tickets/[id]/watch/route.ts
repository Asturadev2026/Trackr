import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.ticketWatcher.upsert({
      where: { ticketId_userId: { ticketId: params.id, userId: session.user.id } },
      update: {},
      create: { ticketId: params.id, userId: session.user.id },
    })

    return NextResponse.json({ watching: true })
  } catch (e) {
    console.error("[tickets/[id]/watch POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.ticketWatcher.deleteMany({
      where: { ticketId: params.id, userId: session.user.id },
    })

    return NextResponse.json({ watching: false })
  } catch (e) {
    console.error("[tickets/[id]/watch DELETE]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
