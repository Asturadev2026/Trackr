"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, ChevronLeft, ChevronRight, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ExcelImportDialog } from "@/components/tracker/excel-import-dialog"
import { cn, formatDate } from "@/lib/utils"
import type { DailyEntryWithTasks, TaskStatus } from "@/types"

interface TaskRow {
  id?: string
  description: string
  projectId: string
  projectName: string
  hours: number
  status: TaskStatus
}

interface WeekDay {
  date: string
  dayLabel: string
  hours: number
  isToday: boolean
  isCurrent: boolean
}

interface Props {
  entry: DailyEntryWithTasks | null
  projects: { id: string; name: string }[]
  currentDate: string
  weekData: WeekDay[]
  userId: string
}

export function DailyTrackerClient({ entry, projects, currentDate, weekData, userId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirect to local date on first load; skip weekends → go to Friday
  useEffect(() => {
    if (!searchParams.get("date")) {
      const now = new Date()
      const day = now.getDay() // 0=Sun, 6=Sat
      if (day === 0) now.setDate(now.getDate() - 2)       // Sun → Fri
      else if (day === 6) now.setDate(now.getDate() - 1)  // Sat → Fri
      const localDate = now.toLocaleDateString("en-CA")
      if (localDate !== currentDate) {
        router.replace(`/my-tracker?date=${localDate}`)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [tasks, setTasks] = useState<TaskRow[]>(
    entry?.tasks.map((t) => ({
      id: t.id,
      description: t.description,
      projectId: t.projectId ?? "",
      projectName: t.projectName ?? "",
      hours: t.hours,
      status: t.status,
    })) ?? []
  )
  const [notes, setNotes] = useState(entry?.notes ?? "")
  const [blockers, setBlockers] = useState(entry?.blockers ?? "")
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const totalHours = tasks.reduce((s, t) => s + t.hours, 0)

  const addTask = () => {
    setTasks((prev) => [
      ...prev,
      { description: "", projectId: "", projectName: "", hours: 0, status: "IN_PROGRESS" },
    ])
  }

  const updateTask = (i: number, field: keyof TaskRow, value: any) => {
    setTasks((prev) => {
      const next = [...prev]
      if (field === "projectId") {
        const proj = projects.find((p) => p.id === value)
        next[i] = { ...next[i], projectId: value, projectName: proj?.name ?? "" }
      } else {
        next[i] = { ...next[i], [field]: value }
      }
      return next
    })
  }

  const removeTask = (i: number) => {
    setTasks((prev) => prev.filter((_, idx) => idx !== i))
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/tracker/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: currentDate, tasks, notes, blockers }),
      })
      if (!res.ok) throw new Error()
      toast.success("Entry saved!")
    } catch {
      toast.error("Failed to save entry")
    } finally {
      setSaving(false)
    }
  }

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(currentDate + "T00:00:00Z")
    d.setUTCDate(d.getUTCDate() + direction)
    // Skip weekends: Fri+1→Mon, Mon-1→Fri
    const day = d.getUTCDay()
    if (day === 6) d.setUTCDate(d.getUTCDate() + (direction === 1 ? 2 : -1))  // Sat
    if (day === 0) d.setUTCDate(d.getUTCDate() + (direction === 1 ? 1 : -2))  // Sun
    router.push(`/my-tracker?date=${d.toISOString().split("T")[0]}`)
  }

  const displayDate = new Date(currentDate + "T00:00:00Z")

  return (
    <>
      <div className="space-y-5 animate-fade-in max-w-4xl">
        {/* Header with tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => router.push("/my-tracker/weekly")}>Weekly</Button>
            <Button variant="secondary" size="sm" className="h-8">Daily</Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => router.push("/my-tracker/calendar")}>Calendar</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
              Import Excel
            </Button>
            <Button size="sm" className="h-8" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Add entry
            </Button>
          </div>
        </div>

        {/* Date nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">
              {displayDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigateDate(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            Total: <strong className="text-foreground">{totalHours.toFixed(1)} hrs</strong>
          </span>
        </div>

        {/* Tasks table */}
        <Card className="shadow-none">
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-[1fr_160px_80px_100px_40px] gap-3 px-4 py-2.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
              <span>Task</span>
              <span>Project</span>
              <span>Hours</span>
              <span>Status</span>
              <span></span>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {tasks.map((task, i) => (
                <div key={i} className="grid grid-cols-[1fr_160px_80px_100px_40px] gap-3 px-4 py-2.5 items-center">
                  <Input
                    placeholder="What did you work on?"
                    className="h-8 border-0 bg-transparent px-0 text-sm focus-visible:ring-0 placeholder:text-muted-foreground"
                    value={task.description}
                    onChange={(e) => updateTask(i, "description", e.target.value)}
                  />
                  <Select
                    value={task.projectId || "none"}
                    onValueChange={(v) => updateTask(i, "projectId", v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 text-xs border-0 bg-transparent focus:ring-0 px-0">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    className="h-8 text-sm"
                    value={task.hours}
                    onChange={(e) => updateTask(i, "hours", parseFloat(e.target.value) || 0)}
                  />
                  <Select
                    value={task.status}
                    onValueChange={(v) => updateTask(i, "status", v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_PROGRESS">In prog</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                      <SelectItem value="BLOCKED">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTask(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add row */}
            <div className="px-4 py-2.5 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={addTask}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add task
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Blockers */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Blockers</p>
          <Textarea
            placeholder="Any blockers or impediments today?"
            rows={2}
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            className="bg-destructive/5 border-destructive/20 placeholder:text-muted-foreground/60 text-sm"
          />
        </div>

        {/* This week at a glance */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">This week at a glance</p>
          <div className="grid grid-cols-5 gap-2">
            {weekData.map((day) => {
              const maxHours = Math.max(...weekData.map((d) => d.hours), 8)
              const heightPct = day.hours > 0 ? Math.max((day.hours / maxHours) * 100, 15) : 0
              return (
                <button
                  key={day.date}
                  onClick={() => router.push(`/my-tracker?date=${day.date}`)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-full h-16 flex items-end justify-center">
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-all",
                        day.isCurrent
                          ? "bg-primary"
                          : day.hours > 0
                          ? "bg-green-500"
                          : "bg-muted group-hover:bg-muted-foreground/20"
                      )}
                      style={{ height: heightPct > 0 ? `${heightPct}%` : "4px" }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      day.isCurrent ? "text-primary font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {day.dayLabel}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Notes</p>
          <Textarea
            placeholder="Any notes for today..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save entry
          </Button>
        </div>
      </div>

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        projects={projects}
        currentDate={currentDate}
        onSuccess={() => router.push(`/my-tracker?date=${currentDate}`)}
      />
    </>
  )
}
