import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { SearchClient } from "@/components/search/search-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Search" }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = searchParams.q?.trim() ?? ""

  if (!q) {
    return <SearchClient query="" tickets={[]} projects={[]} />
  }

  const [tickets, projects] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { ticketKey: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, image: true } },
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
  ])

  return <SearchClient query={q} tickets={tickets} projects={projects} />
}
