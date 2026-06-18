import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId") ?? null

    // Determine week start (Monday)
    let weekStart: Date
    const weekParam = searchParams.get("weekStart")
    if (weekParam) {
      weekStart = new Date(weekParam + "T00:00:00.000Z")
    } else {
      weekStart = new Date()
      const day = weekStart.getUTCDay()
      const diff = day === 0 ? -6 : 1 - day
      weekStart.setUTCDate(weekStart.getUTCDate() + diff)
      weekStart.setUTCHours(0, 0, 0, 0)
    }

    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekStart.getUTCDate() + 4)

    const weekDays = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart)
      d.setUTCDate(weekStart.getUTCDate() + i)
      return d.toISOString().split("T")[0]
    })

    // Determine which users to show
    let userIdFilter: string[] | null = null
    let projectName: string | null = null
    if (projectId) {
      const [members, project] = await Promise.all([
        prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } }),
        prisma.project.findUnique({ where: { id: projectId }, select: { name: true, ownerId: true } }),
      ])
      if (project) {
        projectName = project.name
        userIdFilter = Array.from(new Set([...members.map((m) => m.userId), project.ownerId]))
      }
    }

    const [users, entries] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, ...(userIdFilter ? { id: { in: userIdFilter } } : {}) },
        select: { id: true, name: true, image: true },
        orderBy: { name: "asc" },
      }),
      prisma.dailyEntry.findMany({
        where: {
          date: { gte: weekStart, lte: weekEnd },
          ...(userIdFilter ? { userId: { in: userIdFilter } } : {}),
        },
        include: { tasks: true },
      }),
    ])

    // Build per-member grid
    const members = users.map((user) => {
      const userEntries = entries.filter((e) => e.userId === user.id)
      const dailyHours = weekDays.map((dateStr) => {
        const entry = userEntries.find((e) => e.date.toISOString().split("T")[0] === dateStr)
        if (!entry) return 0
        return Math.round(entry.tasks.reduce((s, t) => s + t.hours, 0) * 10) / 10
      })
      const totalHours = Math.round(dailyHours.reduce((s, h) => s + h, 0) * 10) / 10
      // Under capacity = logged < 60% of expected (5 days * 8h = 40h)
      const underCapacity = totalHours < 40 * 0.6
      return { ...user, dailyHours, totalHours, underCapacity }
    })

    // Hours by project across the whole week
    const allTasks = entries.flatMap((e) => e.tasks)
    const byProjectMap = allTasks.reduce<Record<string, { name: string; hours: number }>>((acc, t) => {
      const key = t.projectId ?? "__general__"
      if (!acc[key]) acc[key] = { name: t.projectName ?? "General", hours: 0 }
      acc[key].hours = Math.round((acc[key].hours + t.hours) * 10) / 10
      return acc
    }, {})
    const byProject = Object.values(byProjectMap).sort((a, b) => b.hours - a.hours)

    const totalLogged = Math.round(members.reduce((s, m) => s + m.totalHours, 0) * 10) / 10
    const capacityTotal = users.length * 40
    const avgPerMember = users.length > 0 ? Math.round((totalLogged / users.length) * 10) / 10 : 0

    return NextResponse.json({
      weekStart: weekStart.toISOString().split("T")[0],
      weekEnd: weekEnd.toISOString().split("T")[0],
      weekDays,
      projectName,
      members,
      byProject,
      teamCapacity: {
        logged: totalLogged,
        total: capacityTotal,
        avgPerMember,
        underCapacityMembers: members.filter((m) => m.underCapacity).map((m) => m.name ?? ""),
      },
    })
  } catch (e) {
    console.error("[team-tracker weekly GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
