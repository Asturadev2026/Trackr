"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { format, addDays, subDays, parseISO } from "date-fns"
import {
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock,
  Download, SlidersHorizontal, Bell, Users, TrendingUp, Timer,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

interface Member {
  id: string
  name: string | null
  email: string | null
  image: string | null
  logged: boolean
  hours: number
  taskSummary: string
  projectNames: string[]
  hasBlocker: boolean
  status: "DONE" | "IN_PROGRESS" | "not_logged"
}

interface Props {
  date: string
  projectId: string | null
  projectName: string | null
  members: Member[]
  stats: {
    loggedCount: number
    totalMembers: number
    totalHours: number
    blockerCount: number
    utilizationPct: number
  }
  notLogged: { id: string; name: string; email: string }[]
  projects: { id: string; name: string }[]
}

function Avatar({ name, image, size = "md" }: { name: string | null; image: string | null; size?: "sm" | "md" }) {
  const initials = (name ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
  const colors = ["bg-blue-200 text-blue-800", "bg-green-200 text-green-800", "bg-purple-200 text-purple-800",
    "bg-amber-200 text-amber-800", "bg-rose-200 text-rose-800", "bg-teal-200 text-teal-800"]
  const colorIdx = (name ?? "").charCodeAt(0) % colors.length
  const sz = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm"
  if (image) return <img src={image} alt={name ?? ""} className={cn("rounded-full object-cover shrink-0", sz)} />
  return (
    <div className={cn("rounded-full flex items-center justify-center font-semibold shrink-0", sz, colors[colorIdx])}>
      {initials}
    </div>
  )
}

export function DailyTeamView({ date, projectId, projectName, members, stats, notLogged, projects }: Props) {
  const router = useRouter()
  const [reminding, setReminding] = useState(false)

  const parsedDate = parseISO(date)
  const isToday = date === new Date().toISOString().split("T")[0]

  function navigate(newDate: Date) {
    const d = newDate.toISOString().split("T")[0]
    const params = new URLSearchParams()
    params.set("date", d)
    if (projectId) params.set("projectId", projectId)
    router.push(`/team-tracker?${params}`)
  }

  function setProject(id: string | null) {
    const params = new URLSearchParams()
    params.set("date", date)
    if (id) params.set("projectId", id)
    router.push(`/team-tracker?${params}`)
  }

  async function sendReminders() {
    if (!notLogged.length) return
    setReminding(true)
    try {
      const res = await fetch("/api/team-tracker/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: notLogged.map((u) => u.id), date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Reminder sent to ${data.sent} member${data.sent !== 1 ? "s" : ""}`)
    } catch {
      toast.error("Failed to send reminders")
    } finally {
      setReminding(false)
    }
  }

  function exportCsv() {
    const rows = [["Name", "Hours", "Tasks", "Projects", "Has Blocker", "Status"]]
    members.forEach((m) => rows.push([
      m.name ?? "",
      String(m.hours),
      m.taskSummary,
      m.projectNames.join("; "),
      m.hasBlocker ? "Yes" : "No",
      m.status === "not_logged" ? "Not logged" : m.status === "DONE" ? "Done" : "In progress",
    ]))
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `team-tracker-${date}.csv`
    a.click()
  }

  const displayDate = format(parsedDate, "EEEE, MMM d yyyy")

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Team tracker</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(subDays(parsedDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[160px] text-center">
                {isToday ? "Today" : displayDate}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(addDays(parsedDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projectName ?? "All teams"} · {format(parsedDate, "EEEE, MMM d yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Project filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {projectName ?? "Project"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Filter by project</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProject(null)}>
                All teams
              </DropdownMenuItem>
              {projects.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => setProject(p.id)}>
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          {/* Weekly link */}
          <Button asChild variant="outline" size="sm">
            <Link href={`/team-tracker/weekly${projectId ? `?projectId=${projectId}` : ""}`}>
              Weekly view
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4 text-muted-foreground" />} label="Logged today"
          value={`${stats.loggedCount} / ${stats.totalMembers}`} />
        <StatCard icon={<Timer className="h-4 w-4 text-muted-foreground" />} label="Team hours"
          value={String(stats.totalHours)} />
        <StatCard icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />} label="Blockers"
          value={String(stats.blockerCount)} highlight={stats.blockerCount > 0} />
        <StatCard icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} label="Utilization"
          value={`${stats.utilizationPct}%`} />
      </div>

      {/* Not logged banner */}
      {notLogged.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-amber-50/60 px-4 py-2.5 text-sm dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Not logged yet today:</span>
            <span className="font-semibold text-foreground">
              {notLogged.map((u) => u.name.split(" ").map((p, i) => i === 0 ? p : p[0] + ".").join(" ")).join(", ")}
            </span>
          </div>
          <Button variant="link" size="sm" className="h-auto p-0 text-primary gap-1.5"
            onClick={sendReminders} disabled={reminding}>
            <Bell className="h-3.5 w-3.5" />
            {reminding ? "Sending…" : "Send reminder"}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-44">Member</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Today&apos;s work</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-20">Hours</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Status</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} image={m.image} />
                    <span className="font-medium truncate max-w-[100px]">
                      {m.name?.split(" ")[0] ?? "Unknown"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {m.logged ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="truncate max-w-[340px]">{m.taskSummary || m.projectNames.join(", ")}</span>
                      {m.hasBlocker && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300 shrink-0">
                          <AlertCircle className="h-3 w-3" /> blocker
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="italic text-muted-foreground/60">Not logged yet</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {m.logged ? m.hours : <span className="text-muted-foreground/40">—</span>}
                </td>
                <td className="px-4 py-3">
                  {m.status === "not_logged" ? (
                    <span className="text-muted-foreground/40">—</span>
                  ) : m.status === "DONE" ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <Clock className="h-3.5 w-3.5" /> In prog
                    </span>
                  )}
                </td>
                <td className="pr-3">
                  <input type="checkbox" className="rounded border-input h-4 w-4 accent-primary" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", highlight && "text-destructive")}>{value}</p>
    </div>
  )
}
