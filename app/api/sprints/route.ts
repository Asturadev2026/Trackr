import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1),
  projectId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  goal: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")

    const sprints = await prisma.sprint.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: { select: { id: true, name: true } },
        items: {
          include: {
            ticket: {
              select: {
                id: true,
                ticketKey: true,
                title: true,
                status: true,
                priority: true,
                type: true,
                assignee: { select: { id: true, name: true, image: true } },
              },
            },
          },
        },
      },
      orderBy: { startDate: "desc" },
    })

    return NextResponse.json(sprints)
  } catch (e) {
    console.error("[sprints GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

    const { name, projectId, startDate, endDate, goal } = parsed.data

    const sprint = await prisma.sprint.create({
      data: {
        name,
        projectId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        goal,
      },
      include: {
        project: { select: { id: true, name: true } },
        items: true,
      },
    })

    return NextResponse.json(sprint, { status: 201 })
  } catch (e) {
    console.error("[sprints POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
