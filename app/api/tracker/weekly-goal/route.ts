import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const weekStart = req.nextUrl.searchParams.get("weekStart")
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "weekStart required (YYYY-MM-DD)" }, { status: 400 })
  }

  const record = await prisma.weeklyGoal.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart: new Date(weekStart + "T00:00:00.000Z") } },
    select: { goal: true },
  })

  return NextResponse.json({ goal: record?.goal ?? null })
}

const putSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  goal: z.string().max(2000),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

  const { weekStart, goal } = parsed.data
  const weekStartDate = new Date(weekStart + "T00:00:00.000Z")

  if (!goal.trim()) {
    await prisma.weeklyGoal.deleteMany({
      where: { userId: session.user.id, weekStart: weekStartDate },
    })
    return NextResponse.json({ goal: null })
  }

  const record = await prisma.weeklyGoal.upsert({
    where: { userId_weekStart: { userId: session.user.id, weekStart: weekStartDate } },
    create: { userId: session.user.id, weekStart: weekStartDate, goal: goal.trim() },
    update: { goal: goal.trim() },
  })

  return NextResponse.json({ goal: record.goal })
}
