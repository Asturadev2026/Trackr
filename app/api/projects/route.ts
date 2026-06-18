import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = session.user.id

  const simple = req.nextUrl.searchParams.get("simple")

  const where = { OR: [{ ownerId: userId }, { members: { some: { userId } } }] }

  const projects = simple
    ? await prisma.project.findMany({
        where,
        select: { id: true, name: true },
        orderBy: { updatedAt: "desc" },
      })
    : await prisma.project.findMany({
        where,
        include: {
          _count: { select: { tickets: true, members: true } },
          members: {
            include: { user: { select: { id: true, name: true, image: true } } },
            take: 5,
          },
          owner: { select: { id: true, name: true, image: true } },
        },
        orderBy: { updatedAt: "desc" },
      })

  return NextResponse.json({ data: projects })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

  const { name, description, priority, dueDate, startDate } = parsed.data

  const project = await prisma.project.create({
    data: {
      name,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: "PROJECT_MANAGER" },
      },
    },
  })

  return NextResponse.json(project, { status: 201 })
}
