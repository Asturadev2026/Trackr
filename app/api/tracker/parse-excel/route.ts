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

// Faithful row shapes — one field per original column, preserved verbatim.
interface FaithfulWeeklyRow {
  weekStart: string | null
  weekEnd: string | null
  employeeName: string | null
  role: string | null
  manager: string | null
  weeklyGoal: string | null
  keyDeliverable: string | null
  deadline: string | null
  priority: string | null
  risksBlockers: string | null
  reviewNotes: string | null
  learnings: string | null
  nextFocus: string | null
}
interface FaithfulDailyRow {
  date: string | null
  employeeName: string | null
  role: string | null
  manager: string | null
  taskDescription: string | null
  whyMatters: string | null
  timeFrom: string | null
  timeTo: string | null
  supportNeeded: string | null
  endOfDayStatus: string | null
  carryTomorrow: string | null
  notes: string | null
}

// ── Date / time helpers (unchanged: timezone-independent serial math) ──────────

function serialToYMD(serial: number): string {
  const d = new Date(Math.floor(serial - 25569) * 86400 * 1000)
  return d.toISOString().split("T")[0]
}

function parseDate(val: unknown, fallback: string): string {
  if (!val) return fallback
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, "0")
    const d = String(val.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  if (typeof val === "number") return serialToYMD(val)
  if (typeof val === "string" && val.trim()) {
    const s = val.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // D/M/YYYY (Indian/UK day-first). Only treat as month-first if the 2nd
    // number is clearly a day (>12), which can't be a month.
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (dmy) {
      const first = parseInt(dmy[1])
      const second = parseInt(dmy[2])
      const yr =
        dmy[3].length === 2
          ? String(parseInt(dmy[3]) > 50 ? 1900 + parseInt(dmy[3]) : 2000 + parseInt(dmy[3]))
          : dmy[3]
      let mo: number, dy: number
      if (second > 12) { mo = first; dy = second }   // e.g. 05/18 -> month 5, day 18
      else             { dy = first; mo = second }   // default day-first: 07/05 -> 7 May
      return `${yr}-${String(mo).padStart(2, "0")}-${String(dy).padStart(2, "0")}`
    }
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
  if (typeof val === "number" && val >= 0 && val < 1) return Math.round(val * 24 * 100) / 100
  if (val instanceof Date) return val.getHours() + val.getMinutes() / 60
  const m = String(val).trim().match(/^(\d{1,2}):(\d{2})/)
  if (m) return parseInt(m[1]) + parseInt(m[2]) / 60
  return null
}
function calcHours(from: unknown, to: unknown): number {
  const f = parseTimeHours(from), t = parseTimeHours(to)
  if (f === null || t === null) return 0
  return Math.max(0, Math.round((t - f) * 100) / 100)
}
function mapStatus(val: unknown): "IN_PROGRESS" | "DONE" | "BLOCKED" {
  const s = String(val ?? "").toLowerCase().trim()
  if (s.includes("done") || s.includes("complete") || s.includes("finish")) return "DONE"
  if (s.includes("block")) return "BLOCKED"
  return "IN_PROGRESS"
}
function str(val: unknown): string { return String(val ?? "").trim() }
function strOrNull(val: unknown): string | null { const s = str(val); return s || null }

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

// ── Existing lossy parsers (kept — they still feed the live My Tracker UI) ─────

function parseWeeklySheet(headers: string[], rows: Record<string, unknown>[], fallbackDate: string) {
  const col = {
    weekStart: findCol(headers, "week start"),
    deliverable: findCol(headers, "deliverable", "key task"),
    goal: findCol(headers, "weekly goal", "goal"),
    priority: findCol(headers, "priority"),
    blockers: findCol(headers, "risk", "block"),
    managerNotes: findCol(headers, "review", "discussion"),
    learnings: findCol(headers, "learning"),
    nextFocus: findCol(headers, "focus", "next week"),
  }
  const byDate: Record<string, ParsedEntry> = {}
  let skipped = 0
  for (const row of rows) {
    const date = col.weekStart ? parseDate(row[col.weekStart], fallbackDate) : fallbackDate
    if (!byDate[date]) {
      byDate[date] = {
        date, tasks: [],
        weekGoal: col.goal ? str(row[col.goal]) || undefined : undefined,
        blockers: col.blockers ? str(row[col.blockers]) || undefined : undefined,
        managerNotes: col.managerNotes ? str(row[col.managerNotes]) || undefined : undefined,
        learnings: col.learnings ? str(row[col.learnings]) || undefined : undefined,
        nextFocus: col.nextFocus ? str(row[col.nextFocus]) || undefined : undefined,
      }
    } else if (col.blockers && str(row[col.blockers])) {
      byDate[date].blockers = [byDate[date].blockers, str(row[col.blockers])].filter(Boolean).join("\n")
    }
    const taskDesc = (col.deliverable ? str(row[col.deliverable]) : "") || (col.goal ? str(row[col.goal]) : "")
    if (taskDesc) byDate[date].tasks.push({ description: taskDesc, hours: 0, status: "IN_PROGRESS", priority: col.priority ? str(row[col.priority]) || undefined : undefined })
    else skipped++
  }
  return { entries: Object.values(byDate), skipped }
}

function parseDailySheet(headers: string[], rows: Record<string, unknown>[], fallbackDate: string) {
  const col = {
    date: findCol(headers, "date"),
    task: findCol(headers, "task description", "task"),
    why: findCol(headers, "why this task", "reason", "purpose"),
    timeFrom: findCol(headers, "time block (from)", "from", "start time"),
    timeTo: findCol(headers, "time block (to)", "to", "end time"),
    support: findCol(headers, "support needed"),
    status: findCol(headers, "end-of-day status", "status"),
    carry: findCol(headers, "carry to tomorrow"),
    notes: findCol(headers, "notes"),
    project: findCol(headers, "project"),
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
      byDate[date] = { date, tasks: [task], notes: noteParts.join("\n") || undefined, blockers: col.support ? str(row[col.support]) || undefined : undefined }
    } else {
      byDate[date].tasks.push(task)
      if (col.notes && str(row[col.notes])) byDate[date].notes = byDate[date].notes ? byDate[date].notes + "\n" + str(row[col.notes]) : str(row[col.notes])
      if (col.support && str(row[col.support])) byDate[date].blockers = byDate[date].blockers ? byDate[date].blockers + "\n" + str(row[col.support]) : str(row[col.support])
    }
  }
  return { entries: Object.values(byDate), skipped }
}

// ── NEW: faithful extractors (one field per column, nothing merged/dropped) ────

function faithfulWeekly(headers: string[], rows: Record<string, unknown>[]): FaithfulWeeklyRow[] {
  const col = {
    weekStart: findCol(headers, "week start"),
    weekEnd: findCol(headers, "week end"),
    employee: findCol(headers, "employee"),
    role: findCol(headers, "role"),
    manager: findCol(headers, "manager"),
    goal: findCol(headers, "weekly goal", "goal"),
    deliverable: findCol(headers, "key deliverable", "deliverable"),
    deadline: findCol(headers, "deadline"),
    priority: findCol(headers, "priority"),
    risks: findCol(headers, "risks", "risk"),
    review: findCol(headers, "review", "discussion"),
    learnings: findCol(headers, "learning"),
    focus: findCol(headers, "focus"),
  }
  const get = (r: Record<string, unknown>, c?: string) => (c ? r[c] : undefined)
  return rows.map((r) => ({
    // Dates kept as the EXACT text shown in the cell — no parsing, no swap.
    weekStart: strOrNull(get(r, col.weekStart)),
    weekEnd: strOrNull(get(r, col.weekEnd)),
    employeeName: strOrNull(get(r, col.employee)),
    role: strOrNull(get(r, col.role)),
    manager: strOrNull(get(r, col.manager)),
    weeklyGoal: strOrNull(get(r, col.goal)),
    keyDeliverable: strOrNull(get(r, col.deliverable)),
    deadline: strOrNull(get(r, col.deadline)),
    priority: strOrNull(get(r, col.priority)),
    risksBlockers: strOrNull(get(r, col.risks)),
    reviewNotes: strOrNull(get(r, col.review)),
    learnings: strOrNull(get(r, col.learnings)),
    nextFocus: strOrNull(get(r, col.focus)),
  }))
}

function faithfulDaily(headers: string[], rows: Record<string, unknown>[]): FaithfulDailyRow[] {
  const col = {
    date: findCol(headers, "date"),
    employee: findCol(headers, "employee"),
    role: findCol(headers, "role"),
    manager: findCol(headers, "manager"),
    task: findCol(headers, "task description", "task"),
    why: findCol(headers, "why this task", "why"),
    from: findCol(headers, "time block (from)", "from"),
    to: findCol(headers, "time block (to)", "to"),
    support: findCol(headers, "support needed", "support"),
    status: findCol(headers, "end-of-day status", "status"),
    carry: findCol(headers, "carry to tomorrow", "carry"),
    notes: findCol(headers, "notes"),
  }
  const get = (r: Record<string, unknown>, c?: string) => (c ? r[c] : undefined)
  return rows.map((r) => ({
    // Date/time kept as the EXACT text shown in the cell — no parsing, no swap.
    date: strOrNull(get(r, col.date)),
    employeeName: strOrNull(get(r, col.employee)),
    role: strOrNull(get(r, col.role)),
    manager: strOrNull(get(r, col.manager)),
    taskDescription: strOrNull(get(r, col.task)),
    whyMatters: strOrNull(get(r, col.why)),
    timeFrom: strOrNull(get(r, col.from)),
    timeTo: strOrNull(get(r, col.to)),
    supportNeeded: strOrNull(get(r, col.support)),
    endOfDayStatus: strOrNull(get(r, col.status)),
    carryTomorrow: strOrNull(get(r, col.carry)),
    notes: strOrNull(get(r, col.notes)),
  }))
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
    const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" })

    const fallbackDate = new Date().toISOString().split("T")[0]
    const results: SheetResult[] = []

    // Faithful accumulator (for the exact-export store)
    const faithful = {
      fileBaseName: file.name.replace(/\.[^.]+$/, ""),
      weeklySheetName: null as string | null,
      dailySheetName: null as string | null,
      weekly: [] as FaithfulWeeklyRow[],
      daily: [] as FaithfulDailyRow[],
    }

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][]
      // Display version: raw:false gives the exact text the cell SHOWS
      // (e.g. "01/05/2026" stays "01/05/2026"). Used for the faithful copy so
      // dates/times round-trip identically for every user, in any format.
      const disp = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as unknown[][]

      const headerRowIdx = raw.findIndex((r) => r.some((c) => typeof c === "string" && c.trim().length > 2))
      if (headerRowIdx === -1) continue

      const rawHeaders = (raw[headerRowIdx] as unknown[]).map((h) => String(h ?? "").trim())
      const headers = rawHeaders.filter(Boolean)

      const keepRow = (r: unknown[]) =>
        r.some((c) => c !== "" && c !== null && c !== undefined) &&
        !Object.values(r).map((v) => String(v ?? "").toLowerCase())
          .some((v) => v.includes("employee name") || v.includes("replace this"))

      const toObj = (r: unknown[]) => {
        const obj: Record<string, unknown> = {}
        rawHeaders.forEach((h, i) => { if (h) obj[h] = r[i] ?? "" })
        return obj
      }

      // Raw rows (serials) for the UI/lossy path; display rows (exact text) for faithful.
      const rows = raw.slice(headerRowIdx + 1).filter(keepRow).map(toObj)
      const dispRows = disp.slice(headerRowIdx + 1).filter(keepRow).map(toObj)

      const type = detectSheetType(headers)
      let entries: ParsedEntry[] = []
      let skipped = 0

      if (type === "weekly") {
        ;({ entries, skipped } = parseWeeklySheet(headers, rows, fallbackDate))
        faithful.weekly.push(...faithfulWeekly(headers, dispRows))
        faithful.weeklySheetName ??= sheetName
      } else if (type === "daily") {
        ;({ entries, skipped } = parseDailySheet(headers, rows, fallbackDate))
        faithful.daily.push(...faithfulDaily(headers, dispRows))
        faithful.dailySheetName ??= sheetName
      }

      if (entries.length > 0 || type !== "unknown") {
        results.push({ sheetName, type, entries, skipped })
      }
    }

    // Derive "Vishal_Wadekar" from the weekly sheet name when possible.
    if (faithful.weeklySheetName) {
      const base = faithful.weeklySheetName.replace(/^weekly[_ ]?planner[_ ]?/i, "").trim()
      if (base) faithful.fileBaseName = base
    }

    if (results.length === 0) {
      return NextResponse.json({ error: "No recognisable data found in the file" }, { status: 422 })
    }

    // `sheets` = existing review/UI data (unchanged). `faithful` = exact-export rows.
    return NextResponse.json({ sheets: results, faithful })
  } catch (e) {
    console.error("[parse-excel]", e)
    return NextResponse.json({ error: "Failed to parse file" }, { status: 400 })
  }
}
