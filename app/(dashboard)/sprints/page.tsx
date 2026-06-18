import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { SprintsClient } from "@/components/sprints/sprints-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Sprints" }

export default async function SprintsPage() {
  const session = await getSession()
  const userId = session!.user.id

  const sprints = await prisma.sprint.findMany({
    include: {
      project: { select: { id: true, name: true } },
      items: {
        include: {
          ticket: {
            select: {
              id: true,
              ticketKey: true,
              title: true,
              status: true,
              priority: true,
              type: true,
              assignee: { select: { id: true, name: true, image: true } },
            },
          },
        },
      },
    },
    orderBy: { startDate: "desc" },
  })

  const serialized = sprints.map((s) => ({
    ...s,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    items: s.items.map((item) => ({
      ...item,
      ticket: {
        ...item.ticket,
        type: item.ticket.type as string,
        status: item.ticket.status as string,
        priority: item.ticket.priority as string,
      },
    })),
  }))

  return <SprintsClient sprints={serialized} />
}
