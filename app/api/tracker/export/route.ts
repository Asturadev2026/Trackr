import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import * as XLSX from "xlsx"

// Headers in the EXACT order of the original file.
const WEEKLY_HEADERS = [
  "Week start date",
  "Week end date",
  "Employee Name",
  "Role",
  "Manager",
  "Weekly goal (tied to role expectation)",
  "Key deliverable",
  "Deadline",
  "Priority (High/Medium/Low)",
  "Risks / Blockers",
  "Review discussion notes with manager",
  "Learnings from the week",
  "Focus areas for next week",
]

const DAILY_HEADERS = [
  "Date",
  "Employee Name",
  "Role",
  "Manager",
  "Task Description",
  "Why this task matters",
  "Time block (From)",
  "Time block (To)",
  "Support needed",
  "End-of-day status",
  "Carry to tomorrow (Yes/No)",
  "Notes",
]

// Build a worksheet. All columns are written as plain text, so dates show
// EXACTLY as the user typed them ("01/05/2026" stays "01/05/2026").
function buildSheet(headers: string[], rows: unknown[][], widths: number[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws["!cols"] = widths.map((wch) => ({ wch }))
  return ws
}

// Best-effort sort key from a date string — used ONLY for ordering rows,
// never for display. We auto-detect day-first vs month-first from the whole
// set so a stray ambiguous value can't flip the order.
function detectDayFirst(values: (string | null)[]): boolean {
  let dayFirst = 0, monthFirst = 0
  for (const v of values) {
    const m = (v ?? "").match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
    if (!m) continue
    const a = parseInt(m[1]), b = parseInt(m[2])
    if (a > 12) dayFirst++
    else if (b > 12) monthFirst++
  }
  return dayFirst >= monthFirst // default day-first on a tie
}
function sortKey(v: string | null, dayFirst: boolean): number {
  if (!v) return Number.MAX_SAFE_INTEGER
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) // ISO
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3])
  m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const a = +m[1], b = +m[2]
    let yr = +m[3]; if (yr < 100) yr += yr > 50 ? 1900 : 2000
    const day = dayFirst ? a : b
    const mon = dayFirst ? b : a
    return Date.UTC(yr, mon - 1, day)
  }
  const t = Date.parse(v)
  return isNaN(t) ? Number.MAX_SAFE_INTEGER : t
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const userId = session.user.id

    const [meta, weeklyRaw, dailyRaw] = await Promise.all([
      prisma.plannerMeta.findUnique({ where: { userId } }),
      prisma.weeklyPlannerRow.findMany({ where: { userId }, orderBy: { rowIndex: "asc" } }),
      prisma.dailyPlannerRow.findMany({ where: { userId }, orderBy: { rowIndex: "asc" } }),
    ])

    // Sort chronologically using a best-effort date key (display text untouched).
    const weeklyDayFirst = detectDayFirst(weeklyRaw.map((r) => r.weekStart))
    const dailyDayFirst = detectDayFirst(dailyRaw.map((r) => r.date))
    const weekly = [...weeklyRaw].sort((a, b) => sortKey(a.weekStart, weeklyDayFirst) - sortKey(b.weekStart, weeklyDayFirst))
    const daily = [...dailyRaw].sort((a, b) => sortKey(a.date, dailyDayFirst) - sortKey(b.date, dailyDayFirst))

    const base = meta?.fileBaseName?.trim() || "Tracker"
    const weeklySheetName = (meta?.weeklySheetName || `Weekly_Planner_${base}`).slice(0, 31)
    const dailySheetName = (meta?.dailySheetName || `Daily_Planner_${base}`).slice(0, 31)

    // Map DB rows -> arrays in header order. Every value is the exact stored
    // text; null -> "" to match a blank cell.
    const weeklyRows = weekly.map((r) => [
      r.weekStart ?? "",
      r.weekEnd ?? "",
      r.employeeName ?? "",
      r.role ?? "",
      r.manager ?? "",
      r.weeklyGoal ?? "",
      r.keyDeliverable ?? "",
      r.deadline ?? "",
      r.priority ?? "",
      r.risksBlockers ?? "",
      r.reviewNotes ?? "",
      r.learnings ?? "",
      r.nextFocus ?? "",
    ])

    const dailyRows = daily.map((r) => [
      r.date ?? "",
      r.employeeName ?? "",
      r.role ?? "",
      r.manager ?? "",
      r.taskDescription ?? "",
      r.whyMatters ?? "",
      r.timeFrom ?? "",
      r.timeTo ?? "",
      r.supportNeeded ?? "",
      r.endOfDayStatus ?? "",
      r.carryTomorrow ?? "",
      r.notes ?? "",
    ])

    const weeklySheet = buildSheet(
      WEEKLY_HEADERS,
      weeklyRows,
      [16, 16, 22, 18, 18, 45, 45, 16, 22, 35, 40, 40, 40]
    )

    const dailySheet = buildSheet(
      DAILY_HEADERS,
      dailyRows,
      [16, 22, 18, 18, 45, 40, 18, 18, 18, 20, 24, 35]
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, weeklySheet, weeklySheetName)
    XLSX.utils.book_append_sheet(wb, dailySheet, dailySheetName)

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellDates: true })
    const fileName = `Weekly_&_Daily_Planner_${base}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("[tracker/export GET]", error)
    return NextResponse.json({ error: "Failed to export tracker data" }, { status: 500 })
  }
}