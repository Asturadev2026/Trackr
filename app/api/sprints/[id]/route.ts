import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  goal: z.string().optional(),
})

const addItemSchema = z.object({
  ticketId: z.string(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate)
  if (parsed.data.endDate) data.endDate = new Date(parsed.data.endDate)

  const sprint = await prisma.sprint.update({
    where: { id: params.id },
    data,
    include: {
      project: { select: { id: true, name: true } },
      items: {
        include: {
          ticket: {
            select: {
              id: true, ticketKey: true, title: true, status: true, priority: true, type: true,
              assignee: { select: { id: true, name: true, image: true } },
            },
          },
        },
      },
    },
  })

  return NextResponse.json(sprint)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.sprint.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
