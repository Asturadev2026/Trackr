import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const schema = z.object({ ticketId: z.string() })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

    const item = await prisma.sprintItem.create({
      data: { sprintId: params.id, ticketId: parsed.data.ticketId },
      include: {
        ticket: {
          select: {
            id: true, ticketKey: true, title: true, status: true, priority: true, type: true,
            assignee: { select: { id: true, name: true, image: true } },
          },
        },
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error("[sprints/[id]/items POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const ticketId = searchParams.get("ticketId")
    if (!ticketId) return NextResponse.json({ error: "ticketId required" }, { status: 400 })

    await prisma.sprintItem.deleteMany({ where: { sprintId: params.id, ticketId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[sprints/[id]/items DELETE]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
