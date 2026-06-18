import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { TicketsClient } from "@/components/tickets/tickets-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Tickets" }

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { project?: string; assignee?: string; status?: string; type?: string }
}) {
  const session = await getSession()
  const userId = session!.user.id

  const where: any = {}

  if (searchParams.project) where.projectId = searchParams.project
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.type) where.type = searchParams.type
  if (searchParams.assignee === "me") where.assigneeId = userId

  const [tickets, projects] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, image: true } },
        reporter: { select: { id: true, name: true, image: true } },
        _count: { select: { comments: true, attachments: true, watchers: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return <TicketsClient tickets={tickets} projects={projects} />
}
