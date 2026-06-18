import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.ticketWatcher.upsert({
    where: { ticketId_userId: { ticketId: params.id, userId: session.user.id } },
    update: {},
    create: { ticketId: params.id, userId: session.user.id },
  })

  return NextResponse.json({ watching: true })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.ticketWatcher.deleteMany({
    where: { ticketId: params.id, userId: session.user.id },
  })

  return NextResponse.json({ watching: false })
}
