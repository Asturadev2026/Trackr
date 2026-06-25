import { cache } from "react"
import { notFound } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { TicketDetailClient } from "@/components/tickets/ticket-detail-client"
import type { Metadata } from "next"

// cache() deduplicates: generateMetadata + page both call this, DB hits once
const getTicket = cache((id: string) =>
  prisma.ticket.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, image: true, email: true } },
      reporter: { select: { id: true, name: true, image: true, email: true } },
      comments: {
        include: { author: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
      activityLogs: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      watchers: { include: { user: { select: { id: true, name: true, image: true } } } },
      linkedFrom: {
        include: { target: { select: { id: true, ticketKey: true, title: true, status: true } } },
      },
      linkedTo: {
        include: { source: { select: { id: true, ticketKey: true, title: true, status: true } } },
      },
    },
  })
)

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const ticket = await getTicket(params.id)
  return { title: ticket ? `${ticket.ticketKey} · ${ticket.title}` : "Ticket" }
}

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  const userId = session!.user.id

  const [ticket, allUsers] = await Promise.all([
    getTicket(params.id),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, image: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!ticket) notFound()

  const isWatching = ticket.watchers.some((w) => w.userId === userId)

  return (
    <TicketDetailClient
      ticket={ticket as any}
      projectMembers={allUsers}
      isWatching={isWatching}
      currentUserId={userId}
      userRole={session?.user?.role as string | undefined}
    />
  )
}
