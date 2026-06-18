"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Upload, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ExcelImportDialog } from "@/components/tracker/excel-import-dialog"

interface DayEntry {
  date: string
  hours: number
  taskCount: number
  doneCount: number
  hasBlocker: boolean
  tasks: { description: string; hours: number; status: string }[]
  notes: string | null
  blockers: string | null
}

interface Props {
  projects: { id: string; name: string }[]
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

function hoursColor(hours: number): string {
  if (hours === 0)  return ""
  if (hours < 2)    return "bg-blue-100 text-blue-800"
  if (hours < 5)    return "bg-green-100 text-green-800"
  if (hours < 8)    return "bg-emerald-200 text-emerald-900"
  return "bg-emerald-400 text-white"
}

export function TrackerCalendar({ projects }: Props) {
  const router  = useRouter()
  const today   = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-based
  const [entries, setEntries] = useState<DayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DayEntry | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSelected(null)
    fetch(`/api/tracker/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => { setEntries(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year, month])

  const entryMap = new Map(entries.map((e) => [e.date, e]))

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()   // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = today.toISOString().split("T")[0]
  const totalHours = entries.reduce((s, e) => s + e.hours, 0)
  const activeDays = entries.filter((e) => e.hours > 0).length

  return (
    <>
      <div className="space-y-4 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline"   size="sm" className="h-8" onClick={() => router.push("/my-tracker/weekly")}>Weekly</Button>
            <Button variant="outline"   size="sm" className="h-8" onClick={() => router.push("/my-tracker")}>Daily</Button>
            <Button variant="secondary" size="sm" className="h-8">Calendar</Button>
          </div>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Import Excel
          </Button>
        </div>

        {/* Month nav + stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold w-48 text-center">{MONTHS[month - 1]} {year}</h1>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{totalHours.toFixed(1)}</strong> hrs logged</span>
            <span><strong className="text-foreground">{activeDays}</strong> active days</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">

          {/* Calendar grid */}
          <div className="rounded-xl border bg-card overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            {loading ? (
              <div className="h-80 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
                Loading entries…
              </div>
            ) : (
              <div className="grid grid-cols-7 divide-x divide-y">
                {cells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="h-20 bg-muted/20" />

                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  const entry   = entryMap.get(dateStr)
                  const isToday = dateStr === todayStr
                  const isSel   = selected?.date === dateStr
                  const isFuture = dateStr > todayStr

                  return (
                    <button
                      key={dateStr}
                      onClick={() => {
                        if (entry) setSelected(isSel ? null : entry)
                        else router.push(`/my-tracker?date=${dateStr}`)
                      }}
                      className={cn(
                        "h-20 p-1.5 text-left flex flex-col transition-colors relative",
                        isFuture ? "bg-muted/10 cursor-default" : "hover:bg-muted/40 cursor-pointer",
                        isSel && "ring-2 ring-inset ring-primary"
                      )}
                    >
                      {/* Day number */}
                      <span className={cn(
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                        isToday  ? "bg-primary text-primary-foreground" : "text-foreground",
                        isFuture && "text-muted-foreground"
                      )}>
                        {day}
                      </span>

                      {/* Entry data */}
                      {entry && entry.hours > 0 && (
                        <div className="mt-auto w-full space-y-0.5">
                          <div className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold leading-tight", hoursColor(entry.hours))}>
                            {entry.hours.toFixed(1)}h · {entry.taskCount} task{entry.taskCount !== 1 ? "s" : ""}
                          </div>
                          {entry.doneCount > 0 && (
                            <div className="text-[10px] text-muted-foreground px-0.5">
                              ✓ {entry.doneCount} done
                            </div>
                          )}
                        </div>
                      )}
                      {entry && entry.hours === 0 && entry.taskCount > 0 && (
                        <div className="mt-auto w-full">
                          <div className="rounded px-1.5 py-0.5 text-[11px] bg-blue-50 text-blue-700 leading-tight">
                            {entry.taskCount} task{entry.taskCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                      )}
                      {entry?.hasBlocker && (
                        <div className="absolute top-1 right-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-400" title="Has blocker" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="space-y-3">
            {selected ? (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{new Date(selected.date + "T00:00:00Z").toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric", timeZone:"UTC" })}</p>
                    <p className="text-xs text-muted-foreground">{selected.hours.toFixed(1)} hrs · {selected.taskCount} tasks</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => router.push(`/my-tracker?date=${selected.date}`)}>
                    Edit →
                  </Button>
                </div>

                <div className="p-4 space-y-3">
                  {/* Tasks */}
                  <div className="space-y-1.5">
                    {selected.tasks.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className={cn(
                          "shrink-0 mt-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold",
                          t.status === "DONE"        ? "bg-green-100 text-green-700" :
                          t.status === "BLOCKED"     ? "bg-red-100 text-red-700" :
                                                       "bg-blue-100 text-blue-700"
                        )}>
                          {t.status === "DONE" ? "✓" : t.status === "BLOCKED" ? "!" : "…"}
                        </span>
                        <span className="flex-1 leading-snug">{t.description}</span>
                        {t.hours > 0 && <span className="text-xs text-muted-foreground shrink-0">{t.hours}h</span>}
                      </div>
                    ))}
                  </div>

                  {/* Blockers */}
                  {selected.blockers && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="text-xs font-medium text-red-700">Blockers</span>
                      </div>
                      <p className="text-xs text-red-800 leading-snug">{selected.blockers}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {selected.notes && (
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-xs text-foreground leading-snug whitespace-pre-line">{selected.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
                <p className="text-sm">Click any day with entries to see details</p>
                <p className="text-xs mt-1">Or click an empty day to add an entry</p>
              </div>
            )}

            {/* Month summary */}
            {entries.length > 0 && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Month summary</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-bold">{totalHours.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">hours logged</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeDays}</p>
                    <p className="text-xs text-muted-foreground">active days</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{entries.reduce((s, e) => s + e.taskCount, 0)}</p>
                    <p className="text-xs text-muted-foreground">total tasks</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{entries.reduce((s, e) => s + e.doneCount, 0)}</p>
                    <p className="text-xs text-muted-foreground">completed</p>
                  </div>
                </div>
                {/* Hours heatmap bar */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Daily hours</p>
                  <div className="flex gap-0.5 flex-wrap">
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = `${year}-${String(month).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`
                      const e = entryMap.get(d)
                      return (
                        <div
                          key={d}
                          title={e ? `${d}: ${e.hours.toFixed(1)}h` : d}
                          className={cn("h-3 w-3 rounded-sm cursor-pointer", e && e.hours > 0 ? hoursColor(e.hours) : "bg-muted")}
                          onClick={() => e ? setSelected(e) : router.push(`/my-tracker?date=${d}`)}
                        />
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground">Less</span>
                    {["bg-muted","bg-blue-100","bg-green-100","bg-emerald-200","bg-emerald-400"].map((c, i) => (
                      <div key={i} className={cn("h-2.5 w-2.5 rounded-sm", c)} />
                    ))}
                    <span className="text-[10px] text-muted-foreground">More</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        projects={projects}
        currentDate={todayStr}
        onSuccess={() => {
          fetch(`/api/tracker/calendar?year=${year}&month=${month}`)
            .then(r => r.json())
            .then(setEntries)
        }}
      />
    </>
  )
}
