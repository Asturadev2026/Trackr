import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { DailyTrackerClient } from "@/components/tracker/daily-tracker-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "My Tracker" }

export default async function MyTrackerPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const session = await getSession()
  const userId = session!.user.id

  const dateStr = searchParams.date ?? new Date().toISOString().split("T")[0]
  const date = new Date(dateStr + "T00:00:00.000Z")

  // Compute week range (Mon–Fri) before parallel queries
  const weekStart = new Date(date)
  const dow = weekStart.getUTCDay() // 0=Sun, 1=Mon … 6=Sat
  const diff = dow === 0 ? -6 : 1 - dow   // Sun → back 6 to Monday; others → back to Monday
  weekStart.setUTCDate(weekStart.getUTCDate() + diff)
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart)
    d.setUTCDate(weekStart.getUTCDate() + i)
    return d
  })

  // All 3 queries in parallel
  const [entry, projects, weekEntries] = await Promise.all([
    prisma.dailyEntry.findUnique({
      where: { userId_date: { userId, date } },
      include: { tasks: { orderBy: { order: "asc" } } },
    }),
    prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.dailyEntry.findMany({
      where: {
        userId,
        date: { gte: weekDays[0], lte: weekDays[4] },
      },
      include: { tasks: true },
    }),
  ])

  const weekData = weekDays.map((d) => {
    const e = weekEntries.find((e) => e.date.toISOString().split("T")[0] === d.toISOString().split("T")[0])
    return {
      date: d.toISOString().split("T")[0],
      dayLabel: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      hours: e?.tasks.reduce((s, t) => s + t.hours, 0) ?? 0,
      isToday: d.toISOString().split("T")[0] === new Date().toISOString().split("T")[0],
      isCurrent: d.toISOString().split("T")[0] === dateStr,
    }
  })

  return (
    <DailyTrackerClient
      key={dateStr}
      entry={entry}
      projects={projects}
      currentDate={dateStr}
      weekData={weekData}
      userId={userId}
    />
  )
}
