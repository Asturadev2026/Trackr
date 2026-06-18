import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { TeamClient } from "@/components/team/team-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Team" }

export default async function TeamPage() {
  const session = await getSession()
  const userId = session!.user.id
  const isAdmin = session!.user.role === "ADMIN" || session!.user.role === "PROJECT_MANAGER"

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { assignedTickets: true, projectMembers: true } },
    },
    orderBy: { name: "asc" },
  })

  return <TeamClient users={users} currentUserId={userId} isAdmin={isAdmin} />
}
