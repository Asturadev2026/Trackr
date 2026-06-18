import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { ReportsClient } from "@/components/reports/reports-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Reports" }

export default async function ReportsPage() {
  const session = await getSession()
  const userId = session!.user.id

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    ticketsByStatus,
    ticketsByPriority,
    ticketsByType,
    ticketsCreatedLast30,
    teamWorkload,
  ] = await Promise.all([
    prisma.ticket.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.ticket.groupBy({ by: ["priority"], _count: { id: true } }),
    prisma.ticket.groupBy({ by: ["type"], _count: { id: true } }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        image: true,
        _count: {
          select: {
            assignedTickets: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <ReportsClient
      ticketsByStatus={ticketsByStatus}
      ticketsByPriority={ticketsByPriority}
      ticketsByType={ticketsByType}
      ticketsCreatedLast30={ticketsCreatedLast30}
      teamWorkload={teamWorkload}
    />
  )
}
