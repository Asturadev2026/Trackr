"use client"

import { useRouter } from "next/navigation"
import { format, addWeeks, subWeeks, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight, SlidersHorizontal, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface DayTask {
  description: string
  hours: number
  projectName: string | null
  status: string
}

interface DayData {
  hours: number
  tasks: DayTask[]
  blockers: string
}

interface Member {
  id: string
  name: string | null
  image: string | null
  dailyData: DayData[]
  totalHours: number
  underCapacity: boolean
}

interface Props {
  weekStart: string
  weekEnd: string
  weekDays: string[]
  projectId: string | null
  projectName: string | null
  members: Member[]
  byProject: { name: string; hours: number }[]
  teamCapacity: { logged: number; total: number; avgPerMember: number; underCapacityMembers: string[] }
  projects: { id: string; name: string }[]
}

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  const initials = (name ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
  const colors = ["bg-blue-200 text-blue-800", "bg-green-200 text-green-800", "bg-purple-200 text-purple-800",
    "bg-amber-200 text-amber-800", "bg-rose-200 text-rose-800", "bg-teal-200 text-teal-800"]
  const colorIdx = (name ?? "").charCodeAt(0) % colors.length
  if (image) return <img src={image} alt={name ?? ""} className="h-7 w-7 rounded-full object-cover shrink-0" />
  return (
    <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0", colors[colorIdx])}>
      {initials}
    </div>
  )
}

function heatColor(hours: number): string {
  if (hours === 0) return "bg-muted/40 text-muted-foreground/40"
  if (hours < 3) return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
  if (hours < 5) return "bg-emerald-300 text-emerald-900 hover:bg-emerald-400"
  if (hours < 7) return "bg-emerald-500 text-white hover:bg-emerald-600"
  return "bg-emerald-700 text-white hover:bg-emerald-800"
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"]

function TaskPopover({ day, dayLabel, memberName, data }: {
  day: string; dayLabel: string; memberName: string | null; data: DayData
}) {
  if (data.hours === 0) {
    return (
      <div className={cn("mx-auto w-14 rounded-lg py-2 text-sm font-semibold tabular-nums text-center", heatColor(0))}>
        0
      </div>
    )
  }

  const formattedDate = format(parseISO(day), "MMM d")

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(
          "mx-auto w-14 rounded-lg py-2 text-sm font-semibold tabular-nums text-center cursor-pointer transition-colors",
          heatColor(data.hours)
        )}>
          {data.hours}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" side="top" align="center">
        <div className="px-3 py-2.5 border-b bg-muted/30">
          <p className="font-semibold text-sm">{memberName?.split(" ")[0]} · {dayLabel}, {formattedDate}</p>
          <p className="text-xs text-muted-foreground">{data.hours}h total · {data.tasks.length} task{data.tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
          {data.tasks.map((task, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors">
              <div className="mt-0.5 shrink-0">
                {task.status === "DONE" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : task.status === "BLOCKED" ? (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-snug">{task.description}</p>
                {task.projectName && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{task.projectName}</p>
                )}
              </div>
              {task.hours > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{task.hours}h</span>
              )}
            </div>
          ))}
          {data.blockers && (
            <div className="mt-1 rounded-md bg-red-50 dark:bg-red-950/30 px-2 py-1.5 flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{data.blockers}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function WeeklyTeamView({ weekStart, weekEnd, weekDays, projectId, projectName, members, byProject, teamCapacity, projects }: Props) {
  const router = useRouter()
  const parsedStart = parseISO(weekStart)
  const parsedEnd = parseISO(weekEnd)
  const rangeLabel = `${format(parsedStart, "MMM d")} – ${format(parsedEnd, "MMM d, yyyy")}`

  function navigate(dir: "prev" | "next") {
    const next = dir === "prev" ? subWeeks(parsedStart, 1) : addWeeks(parsedStart, 1)
    const params = new URLSearchParams()
    params.set("weekStart", next.toISOString().split("T")[0])
    if (projectId) params.set("projectId", projectId)
    router.push(`/team-tracker/weekly?${params}`)
  }

  function setProject(id: string | null) {
    const params = new URLSearchParams()
    params.set("weekStart", weekStart)
    if (id) params.set("projectId", id)
    router.push(`/team-tracker/weekly?${params}`)
  }

  const maxProjectHours = byProject[0]?.hours ?? 1
  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Team tracker · Weekly</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[160px] text-center">{rangeLabel}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Hours logged per member per day · darker = more hours · click a cell to see tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              <DropdownMenuItem onClick={() => setProject(null)}>All teams</DropdownMenuItem>
              {projects.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => setProject(p.id)}>{p.name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild variant="outline" size="sm">
            <Link href={`/team-tracker${projectId ? `?projectId=${projectId}` : ""}`}>Daily view</Link>
          </Button>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-44" />
              {DAY_LABELS.map((label, i) => (
                <th key={label} className={cn(
                  "px-2 py-3 text-center font-medium text-muted-foreground",
                  weekDays[i] === today && "text-primary"
                )}>
                  {label}
                  {weekDays[i] === today && <span className="ml-1 text-[10px] text-primary">●</span>}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-20">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={m.name} image={m.image} />
                    <span className="font-medium truncate max-w-[100px]">
                      {m.name?.split(" ")[0] ?? "Unknown"}
                    </span>
                  </div>
                </td>
                {m.dailyData.map((dayData, i) => (
                  <td key={i} className="px-2 py-2 text-center">
                    <TaskPopover
                      day={weekDays[i]}
                      dayLabel={DAY_LABELS[i]}
                      memberName={m.name}
                      data={dayData}
                    />
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <span className={cn("font-bold tabular-nums", m.underCapacity && "text-destructive")}>
                    {m.totalHours}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Team capacity */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Team capacity</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Logged this week</span>
              <span className="font-bold tabular-nums">{teamCapacity.logged} / {teamCapacity.total} h</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (teamCapacity.logged / Math.max(teamCapacity.total, 1)) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg / member</span>
            <span className="font-semibold tabular-nums">{teamCapacity.avgPerMember} h</span>
          </div>
          {teamCapacity.underCapacityMembers.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Under capacity</span>
              <span className="font-semibold text-destructive">
                {teamCapacity.underCapacityMembers.map((n) =>
                  n.split(" ").map((p, i) => i === 0 ? p : p[0] + ".").join(" ")
                ).join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Hours by project */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Hours by project</h2>
          {byProject.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for this week</p>
          ) : (
            <div className="space-y-3">
              {byProject.map((p, i) => {
                const barColors = ["bg-violet-500", "bg-emerald-500", "bg-orange-500", "bg-slate-400", "bg-pink-500", "bg-cyan-500"]
                const color = barColors[i % barColors.length]
                return (
                  <div key={p.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]">{p.name}</span>
                      <span className="text-muted-foreground tabular-nums shrink-0 ml-2">{p.hours} h</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", color)}
                        style={{ width: `${Math.max(4, (p.hours / maxProjectHours) * 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
