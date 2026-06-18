import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get("date") ?? new Date().toISOString().split("T")[0]
    const projectId = searchParams.get("projectId") ?? null
    const date = new Date(dateStr + "T00:00:00.000Z")

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
        select: { id: true, name: true, email: true, image: true },
        orderBy: { name: "asc" },
      }),
      prisma.dailyEntry.findMany({
        where: {
          date,
          ...(userIdFilter ? { userId: { in: userIdFilter } } : {}),
        },
        include: { tasks: true },
      }),
    ])

    const entryMap = new Map(entries.map((e) => [e.userId, e]))

    const members = users.map((user) => {
      const entry = entryMap.get(user.id)
      if (!entry) {
        return { ...user, logged: false, hours: 0, taskSummary: "", projectNames: [] as string[], hasBlocker: false, status: "not_logged" as const }
      }
      const hours = Math.round(entry.tasks.reduce((s, t) => s + t.hours, 0) * 10) / 10
      const taskSummary = entry.tasks.map((t) => t.description).join(", ")
      const projectNames = Array.from(new Set(entry.tasks.map((t) => t.projectName).filter(Boolean))) as string[]
      const hasBlocker = entry.tasks.some((t) => t.status === "BLOCKED") || !!entry.blockers?.trim()
      const allDone = entry.tasks.length > 0 && entry.tasks.every((t) => t.status === "DONE")
      return {
        ...user,
        logged: true,
        hours,
        taskSummary,
        projectNames,
        hasBlocker,
        status: allDone ? ("DONE" as const) : ("IN_PROGRESS" as const),
      }
    })

    const loggedCount = members.filter((m) => m.logged).length
    const totalHours = Math.round(members.reduce((s, m) => s + m.hours, 0) * 10) / 10
    const blockerCount = members.filter((m) => m.hasBlocker).length
    const utilizationPct = users.length > 0 ? Math.round((totalHours / (users.length * 8)) * 100) : 0

    return NextResponse.json({
      date: dateStr,
      projectName,
      members,
      stats: { loggedCount, totalMembers: users.length, totalHours, blockerCount, utilizationPct },
      notLogged: members.filter((m) => !m.logged).map((m) => ({ id: m.id, name: m.name!, email: m.email! })),
    })
  } catch (e) {
    console.error("[team-tracker daily GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
