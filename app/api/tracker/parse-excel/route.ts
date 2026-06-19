import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import * as XLSX from "xlsx"

// ── Types ─────────────────────────────────────────────────────────────────────

type SheetType = "weekly" | "daily" | "unknown"

interface ParsedTask {
  description: string
  hours: number
  status: "IN_PROGRESS" | "DONE" | "BLOCKED"
  priority?: string
  projectName?: string
}

interface ParsedEntry {
  date: string
  tasks: ParsedTask[]
  notes?: string
  blockers?: string
  weekGoal?: string
  learnings?: string
  nextFocus?: string
  managerNotes?: string
}

interface SheetResult {
  sheetName: string
  type: SheetType
  entries: ParsedEntry[]
  skipped: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────
// We read WITHOUT cellDates so date cells come back as Excel serial numbers,
// not Date objects. The serial → UTC-ms conversion is mathematically
// timezone-independent (works the same on IST dev machines and UTC Railway).

function serialToYMD(serial: number): string {
  // Floor removes the time-of-day fraction so we always get exact midnight UTC
  const d = new Date(Math.floor(serial - 25569) * 86400 * 1000)
  return d.toISOString().split("T")[0]
}

function parseDate(val: unknown, fallback: string): string {
  if (!val) return fallback

  // Without cellDates, dates are serials (numbers). Keep Date branch as a safety net.
  if (val instanceof Date && !isNaN(val.getTime())) {
    // Use local getters — correct regardless of server timezone
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, "0")
    const d = String(val.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  if (typeof val === "number") {
    return serialToYMD(val)
  }

  if (typeof val === "string" && val.trim()) {
    const s = val.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

    // D/M/YYYY or M/D/YYYY — detect format: if first number > 12 it must be the day
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (dmy) {
      let first = parseInt(dmy[1])
      let second = parseInt(dmy[2])
      const yr =
        dmy[3].length === 2
          ? String(parseInt(dmy[3]) > 50 ? 1900 + parseInt(dmy[3]) : 2000 + parseInt(dmy[3]))
          : dmy[3]
      // If first > 12 it can't be a month → D/M/YYYY (Indian/UK format)
      let mo: number, dy: number
      if (first > 12) { dy = first; mo = second }
      else             { mo = first; dy = second }
      return `${yr}-${String(mo).padStart(2, "0")}-${String(dy).padStart(2, "0")}`
    }

    // Other string — parse and use local getters to avoid UTC offset issues
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      return `${y}-${m}-${day}`
    }
  }

  return fallback
}

function parseTimeHours(val: unknown): number | null {
  if (!val) return null
  // Without cellDates, times are plain fractions (0.4375 = 10:30 AM)
  if (typeof val === "number" && val >= 0 && val < 1) return Math.round(val * 24 * 100) / 100
  // Date object safety net
  if (val instanceof Date) return val.getHours() + val.getMinutes() / 60
  const m = String(val).trim().match(/^(\d{1,2}):(\d{2})/)
  if (m) return parseInt(m[1]) + parseInt(m[2]) / 60
  return null
}

function calcHours(from: unknown, to: unknown): number {
  const f = parseTimeHours(from)
  const t = parseTimeHours(to)
  if (f === null || t === null) return 0
  return Math.max(0, Math.round((t - f) * 100) / 100)
}

function mapStatus(val: unknown): "IN_PROGRESS" | "DONE" | "BLOCKED" {
  const s = String(val ?? "").toLowerCase().trim()
  if (s.includes("done") || s.includes("complete") || s.includes("finish")) return "DONE"
  if (s.includes("block")) return "BLOCKED"
  return "IN_PROGRESS"
}

function str(val: unknown): string {
  return String(val ?? "").trim()
}

function detectSheetType(headers: string[]): SheetType {
  const h = headers.map((x) => x.toLowerCase())
  if (h.some((x) => x.includes("week start") || (x.includes("week") && x.includes("end")))) return "weekly"
  if (h.some((x) => x.includes("time block") || x.includes("end-of-day") || x.includes("carry to"))) return "daily"
  if (h.some((x) => x === "date") && h.some((x) => x.includes("task"))) return "daily"
  if (h.some((x) => x.includes("deliverable") || x.includes("goal"))) return "weekly"
  return "unknown"
}

function findCol(headers: string[], ...keywords: string[]): string | undefined {
  return headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k.toLowerCase())))
}

function parseWeeklySheet(
  headers: string[],
  rows: Record<string, unknown>[],
  fallbackDate: string,
): { entries: ParsedEntry[]; skipped: number } {
  const col = {
    weekStart:    findCol(headers, "week start"),
    deliverable:  findCol(headers, "deliverable", "key task"),
    goal:         findCol(headers, "weekly goal", "goal"),
    priority:     findCol(headers, "priority"),
    blockers:     findCol(headers, "risk", "block"),
    managerNotes: findCol(headers, "review", "discussion"),
    learnings:    findCol(headers, "learning"),
    nextFocus:    findCol(headers, "focus", "next week"),
  }

  const byDate: Record<string, ParsedEntry> = {}
  let skipped = 0

  for (const row of rows) {
    const date = col.weekStart ? parseDate(row[col.weekStart], fallbackDate) : fallbackDate

    if (!byDate[date]) {
      byDate[date] = {
        date,
        tasks: [],
        weekGoal:     col.goal         ? str(row[col.goal])         || undefined : undefined,
        blockers:     col.blockers      ? str(row[col.blockers])     || undefined : undefined,
        managerNotes: col.managerNotes  ? str(row[col.managerNotes]) || undefined : undefined,
        learnings:    col.learnings     ? str(row[col.learnings])    || undefined : undefined,
        nextFocus:    col.nextFocus     ? str(row[col.nextFocus])    || undefined : undefined,
      }
    } else if (col.blockers && str(row[col.blockers])) {
      const e = byDate[date]
      e.blockers = [e.blockers, str(row[col.blockers])].filter(Boolean).join("\n")
    }

    const taskDesc =
      (col.deliverable ? str(row[col.deliverable]) : "") ||
      (col.goal        ? str(row[col.goal])         : "")

    if (taskDesc) {
      byDate[date].tasks.push({
        description: taskDesc,
        hours: 0,
        status: "IN_PROGRESS",
        priority: col.priority ? str(row[col.priority]) || undefined : undefined,
      })
    } else {
      skipped++
    }
  }

  return { entries: Object.values(byDate), skipped }
}

function parseDailySheet(
  headers: string[],
  rows: Record<string, unknown>[],
  fallbackDate: string,
): { entries: ParsedEntry[]; skipped: number } {
  const col = {
    date:     findCol(headers, "date"),
    task:     findCol(headers, "task description", "task"),
    why:      findCol(headers, "why this task", "reason", "purpose"),
    timeFrom: findCol(headers, "time block (from)", "from", "start time"),
    timeTo:   findCol(headers, "time block (to)", "to", "end time"),
    support:  findCol(headers, "support needed"),
    status:   findCol(headers, "end-of-day status", "status"),
    carry:    findCol(headers, "carry to tomorrow"),
    notes:    findCol(headers, "notes"),
    project:  findCol(headers, "project"),
  }

  const byDate: Record<string, ParsedEntry> = {}
  let skipped = 0

  for (const row of rows) {
    const date = col.date ? parseDate(row[col.date], fallbackDate) : fallbackDate
    const taskDesc = col.task ? str(row[col.task]) : ""

    if (!taskDesc) { skipped++; continue }

    const hours = calcHours(col.timeFrom ? row[col.timeFrom] : null, col.timeTo ? row[col.timeTo] : null)
    const status = col.status ? mapStatus(row[col.status]) : "IN_PROGRESS"
    const projName = col.project ? str(row[col.project]) || undefined : undefined
    const task: ParsedTask = { description: taskDesc, hours, status, projectName: projName }

    if (!byDate[date]) {
      const noteParts: string[] = []
      if (col.why && str(row[col.why])) noteParts.push(`**Why:** ${str(row[col.why])}`)
      if (col.carry && str(row[col.carry]).toLowerCase().includes("yes")) noteParts.push("*Carry to tomorrow*")
      if (col.notes && str(row[col.notes])) noteParts.push(str(row[col.notes]))

      byDate[date] = {
        date,
        tasks: [task],
        notes: noteParts.join("\n") || undefined,
        blockers: col.support ? str(row[col.support]) || undefined : undefined,
      }
    } else {
      byDate[date].tasks.push(task)
      if (col.notes && str(row[col.notes])) {
        const n = str(row[col.notes])
        byDate[date].notes = byDate[date].notes ? byDate[date].notes + "\n" + n : n
      }
      if (col.support && str(row[col.support])) {
        const s = str(row[col.support])
        byDate[date].blockers = byDate[date].blockers ? byDate[date].blockers + "\n" + s : s
      }
    }
  }

  return { entries: Object.values(byDate), skipped }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    // No cellDates — dates stay as serial numbers, times as fractions.
    // Serial → UTC conversion is timezone-independent (works on IST dev + UTC Railway).
    const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" })

    const fallbackDate = new Date().toISOString().split("T")[0]
    const results: SheetResult[] = []

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][]

      const headerRowIdx = raw.findIndex((r) =>
        r.some((c) => typeof c === "string" && c.trim().length > 2),
      )
      if (headerRowIdx === -1) continue

      const rawHeaders = (raw[headerRowIdx] as unknown[]).map((h) => String(h ?? "").trim())
      const headers = rawHeaders.filter(Boolean)

      const rows = raw
        .slice(headerRowIdx + 1)
        .filter((r) => r.some((c) => c !== "" && c !== null && c !== undefined))
        .map((r) => {
          const obj: Record<string, unknown> = {}
          rawHeaders.forEach((h, i) => { if (h) obj[h] = r[i] ?? "" })
          return obj
        })
        // Filter out template/example rows by checking all cell values
        .filter((row) => {
          const vals = Object.values(row).map((v) => String(v ?? "").toLowerCase())
          return !vals.some((v) => v.includes("employee name") || v.includes("replace this"))
        })

      const type = detectSheetType(headers)
      let entries: ParsedEntry[] = []
      let skipped = 0

      if (type === "weekly") {
        ;({ entries, skipped } = parseWeeklySheet(headers, rows, fallbackDate))
      } else if (type === "daily") {
        ;({ entries, skipped } = parseDailySheet(headers, rows, fallbackDate))
      }

      if (entries.length > 0 || type !== "unknown") {
        results.push({ sheetName, type, entries, skipped })
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ error: "No recognisable data found in the file" }, { status: 422 })
    }

    return NextResponse.json({ sheets: results })
  } catch (e) {
    console.error("[parse-excel]", e)
    return NextResponse.json({ error: "Failed to parse file" }, { status: 400 })
  }
}
