import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { WeeklyTeamView } from "@/components/team-tracker/weekly-team-view"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Team Tracker · Weekly" }

export default async function TeamTrackerWeeklyPage({
  searchParams,
}: {
  searchParams: { weekStart?: string; projectId?: string }
}) {
  const session = await getSession()
  const userId = session!.user.id
  const projectId = searchParams.projectId ?? null

  // Determine week start (Monday)
  let weekStart: Date
  if (searchParams.weekStart) {
    weekStart = new Date(searchParams.weekStart + "T00:00:00.000Z")
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

  const [users, entries, projects] = await Promise.all([
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
    prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }], status: { in: ["ACTIVE", "AT_RISK", "DELAYED"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const members = users.map((user) => {
    const userEntries = entries.filter((e) => e.userId === user.id)
    const dailyData = weekDays.map((dateStr) => {
      const entry = userEntries.find((e) => e.date.toISOString().split("T")[0] === dateStr)
      if (!entry) return { hours: 0, tasks: [] as { description: string; hours: number; projectName: string | null; status: string }[], blockers: "" }
      const hours = Math.round(entry.tasks.reduce((s, t) => s + t.hours, 0) * 10) / 10
      return {
        hours,
        tasks: entry.tasks.map((t) => ({ description: t.description, hours: t.hours, projectName: t.projectName, status: t.status })),
        blockers: entry.blockers ?? "",
      }
    })
    const totalHours = Math.round(dailyData.reduce((s, d) => s + d.hours, 0) * 10) / 10
    return { ...user, dailyData, totalHours, underCapacity: totalHours < 24 }
  })

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

  return (
    <WeeklyTeamView
      weekStart={weekStart.toISOString().split("T")[0]}
      weekEnd={weekEnd.toISOString().split("T")[0]}
      weekDays={weekDays}
      projectId={projectId}
      projectName={projectName}
      members={members}
      byProject={byProject}
      teamCapacity={{ logged: totalLogged, total: capacityTotal, avgPerMember, underCapacityMembers: members.filter((m) => m.underCapacity).map((m) => m.name ?? "") }}
      projects={projects}
    />
  )
}
