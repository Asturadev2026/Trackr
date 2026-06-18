import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { WeeklyTrackerClient } from "@/components/tracker/weekly-tracker-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Weekly Tracker" }

export default async function WeeklyTrackerPage({
  searchParams,
}: {
  searchParams: { week?: string }
}) {
  const session = await getSession()
  const userId = session!.user.id

  // Determine week start (Monday)
  let weekStart: Date
  if (searchParams.week) {
    weekStart = new Date(searchParams.week + "T00:00:00.000Z")
  } else {
    weekStart = new Date()
    const day = weekStart.getUTCDay()
    const diff = day === 0 ? -6 : 1 - day
    weekStart.setUTCDate(weekStart.getUTCDate() + diff)
    weekStart.setUTCHours(0, 0, 0, 0)
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 4) // Mon–Fri only

  const entries = await prisma.dailyEntry.findMany({
    where: { userId, date: { gte: weekStart, lte: weekEnd } },
    include: { tasks: { orderBy: { order: "asc" } } },
    orderBy: { date: "asc" },
  })

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart)
    d.setUTCDate(weekStart.getUTCDate() + i)
    const dateStr = d.toISOString().split("T")[0]
    const entry = entries.find((e) => e.date.toISOString().split("T")[0] === dateStr)
    return {
      date: dateStr,
      dayLabel: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      dayNum: d.getUTCDate(),
      hours: entry?.tasks.reduce((s, t) => s + t.hours, 0) ?? 0,
      tasks: entry?.tasks ?? [],
      notes: entry?.notes ?? "",
      blockers: entry?.blockers ?? "",
    }
  })

  // Project breakdown
  const allTasks = entries.flatMap((e) => e.tasks)
  const byProject = allTasks.reduce<Record<string, { name: string; hours: number }>>(
    (acc, t) => {
      const key = t.projectId ?? "__general__"
      if (!acc[key]) acc[key] = { name: t.projectName ?? "General", hours: 0 }
      acc[key].hours += t.hours
      return acc
    },
    {}
  )

  const totalHours = allTasks.reduce((s, t) => s + t.hours, 0)

  return (
    <WeeklyTrackerClient
      weekDays={weekDays}
      weekStart={weekStart.toISOString().split("T")[0]}
      byProject={Object.values(byProject)}
      totalHours={totalHours}
    />
  )
}
