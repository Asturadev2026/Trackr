"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Pencil, X, Check, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { ExcelImportDialog } from "@/components/tracker/excel-import-dialog"
import { cn } from "@/lib/utils"

interface WeekDay {
  date: string
  dayLabel: string
  dayNum: number
  hours: number
  tasks: { description: string; hours: number; status: string }[]
  notes: string
  blockers: string
}

interface Props {
  weekDays: WeekDay[]
  weekStart: string
  byProject: { name: string; hours: number }[]
  totalHours: number
  weeklyGoal: string | null
}

const TARGET_HOURS = 40

export function WeeklyTrackerClient({ weekDays, weekStart, byProject, totalHours, weeklyGoal }: Props) {
  const router = useRouter()
  const [goal, setGoal] = useState(weeklyGoal ?? "")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const startEdit = () => {
    setDraft(goal)
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const saveGoal = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/tracker/weekly-goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, goal: draft }),
      })
      if (res.ok) {
        const data = await res.json()
        setGoal(data.goal ?? "")
      }
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const onImportSuccess = async () => {
    setImportOpen(false)
    const res = await fetch(`/api/tracker/weekly-goal?weekStart=${weekStart}`)
    if (res.ok) {
      const data = await res.json()
      setGoal(data.goal ?? "")
    }
    router.refresh()
  }

  const navigateWeek = (dir: -1 | 1) => {
    const d = new Date(weekStart + "T00:00:00Z")
    d.setUTCDate(d.getUTCDate() + dir * 7)
    router.push(`/my-tracker/weekly?week=${d.toISOString().split("T")[0]}`)
  }

  const weekLabel = () => {
    const start = new Date(weekStart + "T00:00:00Z")
    const end = new Date(weekStart + "T00:00:00Z")
    end.setUTCDate(end.getUTCDate() + 4)
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline"   size="sm" className="h-8" onClick={() => router.push("/my-tracker")}>Daily</Button>
          <Button variant="secondary" size="sm" className="h-8">Weekly</Button>
          <Button variant="outline"   size="sm" className="h-8" onClick={() => router.push("/my-tracker/calendar")}>Calendar</Button>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setImportOpen(true)}>
          <Upload className="h-3.5 w-3.5" />
          Import Excel
        </Button>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">{weekLabel()}</h1>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: <strong className="text-foreground">{totalHours.toFixed(1)} hrs</strong>
          {" / "}{TARGET_HOURS} expected
        </div>
      </div>

      {/* Weekly Goal */}
      <Card className="shadow-none border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Weekly Goal
              </p>
              {editing ? (
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="What do you want to achieve this week?"
                  className="text-sm resize-none min-h-[72px]"
                  autoFocus
                />
              ) : (
                <p className="text-sm leading-relaxed">
                  {goal ? (
                    goal
                  ) : (
                    <span className="text-muted-foreground italic">No goal set for this week.</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              {editing ? (
                <>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={saveGoal}
                    disabled={saving}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={startEdit}
                  title="Edit weekly goal"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day columns */}
      <div className="grid grid-cols-5 gap-2 items-start">
        {weekDays.map((day) => (
          <Link key={day.date} href={`/my-tracker?date=${day.date}`}>
            <Card
              className={cn(
                "shadow-none hover:shadow-sm transition-shadow cursor-pointer",
                day.date === new Date().toISOString().split("T")[0] && "ring-1 ring-primary"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{day.dayLabel}</span>
                  <span className={cn(
                    "text-xs font-bold tabular-nums",
                    day.hours >= 8 ? "text-green-600" : day.hours > 0 ? "text-primary" : "text-muted-foreground"
                  )}>{day.hours.toFixed(1)}h</span>
                </div>
                {day.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {day.tasks.map((t, i) => (
                      <div key={i} className="space-y-0.5">
                        <p className="text-xs text-foreground leading-snug break-words">{t.description}</p>
                        {t.hours > 0 && (
                          <p className="text-[10px] text-muted-foreground">{t.hours}h</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No entries</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Weekly summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Hours logged</span>
              <span className="font-medium">{totalHours.toFixed(1)} / {TARGET_HOURS}</span>
            </div>
            <Progress value={(totalHours / TARGET_HOURS) * 100} className="h-2 mb-4" />
            <div className="space-y-2">
              {byProject.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{p.name}</span>
                  <span className="font-medium shrink-0 ml-2">{p.hours.toFixed(1)}h</span>
                </div>
              ))}
              {byProject.length === 0 && (
                <p className="text-xs text-muted-foreground">No hours logged this week</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Daily breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weekDays.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8 shrink-0">{day.dayLabel}</span>
                  <Progress
                    value={(day.hours / 8) * 100}
                    className="flex-1 h-2"
                    indicatorClassName={day.hours >= 8 ? "bg-green-500" : day.hours > 0 ? "bg-primary" : "bg-muted"}
                  />
                  <span className="text-xs font-medium w-10 text-right shrink-0">
                    {day.hours.toFixed(1)}h
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={onImportSuccess}
      />
    </div>
  )
}
