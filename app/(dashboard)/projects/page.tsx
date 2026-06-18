import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { ProjectsClient } from "@/components/projects/projects-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Projects" }

export default async function ProjectsPage() {
  const session = await getSession()
  const userId = session!.user.id

  // Single query: projects + members
  const projects = await prisma.project.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
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

  if (projects.length === 0) {
    return <ProjectsClient projects={[]} />
  }

  // ONE grouped query instead of 2×N individual count queries
  const projectIds = projects.map((p) => p.id)
  const ticketGroups = await prisma.ticket.groupBy({
    by: ["projectId", "status"],
    where: { projectId: { in: projectIds } },
    _count: { id: true },
  })

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

  return <ProjectsClient projects={projectsWithStats} />
}
