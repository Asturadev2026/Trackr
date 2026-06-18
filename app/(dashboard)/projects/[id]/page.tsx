import { cache } from "react"
import { notFound } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { ProjectDetailClient } from "@/components/projects/project-detail-client"
import type { Metadata } from "next"

// cache() deduplicates: generateMetadata + page both call this, DB hits once
const getProject = cache((id: string) =>
  prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, image: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, image: true, email: true, role: true } } },
      },
      phases: { orderBy: { order: "asc" } },
      sprints: { orderBy: { createdAt: "desc" }, take: 5 },
      workflowSteps: {
        orderBy: { order: "asc" },
        include: { subSteps: { orderBy: { order: "asc" } } },
      },
      _count: { select: { tickets: true, members: true } },
    },
  })
)

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const project = await getProject(params.id)
  return { title: project?.name ?? "Project" }
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  const userId = session!.user.id

  const [project, ticketGroups, allTickets, platformUsers] = await Promise.all([
    getProject(params.id),
    prisma.ticket.groupBy({
      by: ["status"],
      where: { projectId: params.id },
      _count: { id: true },
    }),
    prisma.ticket.findMany({
      where: { projectId: params.id },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        reporter: { select: { id: true, name: true, image: true } },
        _count: { select: { comments: true, attachments: true, watchers: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, image: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!project) notFound()

  const statsMap = new Map(ticketGroups.map((g) => [g.status, g._count.id]))
  const stats = {
    total:      ticketGroups.reduce((s, g) => s + g._count.id, 0),
    done:       statsMap.get("DONE")        ?? 0,
    open:       statsMap.get("OPEN")        ?? 0,
    inProgress: statsMap.get("IN_PROGRESS") ?? 0,
  }

  return (
    <ProjectDetailClient
      project={project}
      stats={stats}
      recentTickets={allTickets.slice(0, 5)}
      allTickets={allTickets}
      platformUsers={platformUsers}
      userId={userId}
    />
  )
}
