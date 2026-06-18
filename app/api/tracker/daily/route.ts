import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const taskSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  hours: z.number().min(0).max(24),
  status: z.enum(["IN_PROGRESS", "DONE", "BLOCKED"]),
})

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tasks: z.array(taskSchema),
  notes: z.string().optional(),
  blockers: z.string().optional(),
  mood: z.number().min(1).max(5).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const dateStr = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0]
    const date = new Date(dateStr + "T00:00:00.000Z")

    const entry = await prisma.dailyEntry.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
      include: { tasks: { orderBy: { order: "asc" } } },
    })

    return NextResponse.json(entry)
  } catch (e) {
    console.error("[tracker/daily GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = entrySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

    const { date: dateStr, tasks, notes, blockers, mood } = parsed.data
    const date = new Date(dateStr + "T00:00:00.000Z")

    const entry = await prisma.dailyEntry.upsert({
      where: { userId_date: { userId: session.user.id, date } },
      update: { notes, blockers, mood, tasks: { deleteMany: {} } },
      create: { userId: session.user.id, date, notes, blockers, mood },
    })

    // Recreate tasks
    if (tasks.length > 0) {
      await prisma.dailyTask.createMany({
        data: tasks.map((t, i) => ({
          entryId: entry.id,
          description: t.description,
          projectId: t.projectId || null,
          projectName: t.projectName || null,
          hours: t.hours,
          status: t.status,
          order: i,
        })),
      })
    }

    const result = await prisma.dailyEntry.findUnique({
      where: { id: entry.id },
      include: { tasks: { orderBy: { order: "asc" } } },
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error("[tracker/daily POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
