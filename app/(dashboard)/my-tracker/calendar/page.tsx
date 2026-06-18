import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { TrackerCalendar } from "@/components/tracker/tracker-calendar"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Tracker Calendar" }

export default async function TrackerCalendarPage() {
  const session = await getSession()
  const userId = session!.user.id

  const projects = await prisma.project.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return <TrackerCalendar projects={projects} />
}
