import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { DashboardStats } from "@/components/dashboard/stats-cards"
import { MyTicketsTable } from "@/components/dashboard/my-tickets-table"
import { ProjectHealth } from "@/components/dashboard/project-health"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Dashboard" }

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default async function DashboardPage() {
  const session = await getSession()
  const userId = session!.user.id

  const memberFilter = {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  }

  const weekStart = new Date()
  const dow = weekStart.getUTCDay()
  weekStart.setUTCDate(weekStart.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
  weekStart.setUTCHours(0, 0, 0, 0)

  // All 8 queries run in parallel — ticketGroups no longer waits for projects
  const [myTickets, projects, openTicketCount, totalUsers, totalTickets, totalProjects, weeklyHours, ticketGroups] =
    await Promise.all([
      prisma.ticket.findMany({
        where: { assigneeId: userId, status: { not: "DONE" } },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, image: true } },
          reporter: { select: { id: true, name: true, image: true } },
          _count: { select: { comments: true, attachments: true, watchers: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.project.findMany({
        where: { ...memberFilter, status: { in: ["ACTIVE", "AT_RISK", "DELAYED"] } },
        include: {
          _count: { select: { tickets: true, members: true } },
          members: { include: { user: { select: { id: true, name: true, image: true } } }, take: 5 },
          owner: { select: { id: true, name: true, image: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.ticket.count({ where: { assigneeId: userId, status: { not: "DONE" } } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.ticket.count({ where: { project: memberFilter } }),
      prisma.project.count({ where: memberFilter }),
      prisma.dailyTask.aggregate({
        where: {
          entry: {
            userId,
            date: { gte: weekStart },
          },
        },
        _sum: { hours: true },
      }),
      // Runs in parallel with the projects query — uses membership filter directly
      // instead of waiting for project IDs from the projects query above
      prisma.ticket.groupBy({
        by: ["projectId", "status"],
        where: {
          project: { ...memberFilter, status: { in: ["ACTIVE", "AT_RISK", "DELAYED"] } },
        },
        _count: { id: true },
      }),
    ])

  const countMap = new Map<string, { total: number; done: number }>()
  for (const row of ticketGroups) {
    const cur = countMap.get(row.projectId) ?? { total: 0, done: 0 }
    cur.total += row._count.id
    if (row.status === "DONE") cur.done += row._count.id
    countMap.set(row.projectId, cur)
  }
  const projectsWithStats = projects.map((p) => {
    const counts = countMap.get(p.id) ?? { total: 0, done: 0 }
    return { ...p, totalTickets: counts.total, doneTickets: counts.done }
  })

  const stats = {
    totalUsers,
    totalTickets,
    totalProjects,
    hoursThisWeek: Math.round((weeklyHours._sum.hours ?? 0) * 10) / 10,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {openTicketCount > 0
            ? `You have ${openTicketCount} open ticket${openTicketCount !== 1 ? "s" : ""}.`
            : "You're all caught up — great work!"}
        </p>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MyTicketsTable tickets={myTickets} />
        </div>
        <div>
          <ProjectHealth projects={projectsWithStats} />
        </div>
      </div>
    </div>
  )
}
