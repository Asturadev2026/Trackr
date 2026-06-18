import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  if (!q || q.length < 2) return NextResponse.json({ tickets: [], projects: [] })

  const [tickets, projects] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { ticketKey: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true, ticketKey: true, title: true, status: true, priority: true, type: true,
        project: { select: { id: true, name: true } },
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, status: true },
      take: 5,
    }),
  ])

  return NextResponse.json({ tickets, projects })
}
