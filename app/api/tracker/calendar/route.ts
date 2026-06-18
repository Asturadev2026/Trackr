import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const year  = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()))
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1))

    const start = new Date(Date.UTC(year, month - 1, 1))
    const end   = new Date(Date.UTC(year, month, 0, 23, 59, 59))

    const entries = await prisma.dailyEntry.findMany({
      where: { userId: session.user.id, date: { gte: start, lte: end } },
      select: {
        date: true,
        notes: true,
        blockers: true,
        tasks: { select: { hours: true, status: true, description: true } },
      },
    })

    const data = entries.map((e) => ({
      date:       e.date.toISOString().split("T")[0],
      hours:      e.tasks.reduce((s, t) => s + t.hours, 0),
      taskCount:  e.tasks.length,
      doneCount:  e.tasks.filter((t) => t.status === "DONE").length,
      hasBlocker: !!e.blockers?.trim(),
      tasks:      e.tasks.map((t) => ({ description: t.description, hours: t.hours, status: t.status })),
      notes:      e.notes ?? null,
      blockers:   e.blockers ?? null,
    }))

    return NextResponse.json(data)
  } catch (e) {
    console.error("[calendar GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
