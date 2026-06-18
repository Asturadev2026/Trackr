"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { UserAvatar } from "@/components/shared/user-avatar"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { format, subDays, eachDayOfInterval } from "date-fns"

interface Props {
  ticketsByStatus: { status: string; _count: { id: number } }[]
  ticketsByPriority: { priority: string; _count: { id: number } }[]
  ticketsByType: { type: string; _count: { id: number } }[]
  ticketsCreatedLast30: { createdAt: Date; status: string }[]
  teamWorkload: { id: string; name: string | null; image: string | null; _count: { assignedTickets: number } }[]
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#94a3b8",
  IN_PROGRESS: "#60a5fa",
  IN_REVIEW: "#f59e0b",
  DONE: "#22c55e",
  CANCELLED: "#e2e8f0",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#f87171",
  URGENT: "#a855f7",
}

const TYPE_COLORS = ["#60a5fa", "#f87171", "#f59e0b", "#22c55e", "#a855f7"]

export function ReportsClient({
  ticketsByStatus,
  ticketsByPriority,
  ticketsByType,
  ticketsCreatedLast30,
  teamWorkload,
}: Props) {
  const totalTickets = ticketsByStatus.reduce((s, t) => s + t._count.id, 0)

  // Build last 14 days chart data
  const last14 = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() })
  const chartData = last14.map((day) => {
    const dayStr = format(day, "MMM d")
    const created = ticketsCreatedLast30.filter(
      (t) => format(new Date(t.createdAt), "MMM d") === dayStr
    ).length
    const done = ticketsCreatedLast30.filter(
      (t) =>
        format(new Date(t.createdAt), "MMM d") === dayStr && t.status === "DONE"
    ).length
    return { day: dayStr, created, done }
  })

  const statusPieData = ticketsByStatus.map((s) => ({
    name: s.status.replace("_", " "),
    value: s._count.id,
    color: STATUS_COLORS[s.status] ?? "#94a3b8",
  }))

  const typeBarData = ticketsByType.map((t) => ({
    name: t.type,
    value: t._count.id,
  }))

  const maxWorkload = Math.max(...teamWorkload.map((u) => u._count.assignedTickets), 1)

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Reports</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ticketsByStatus.map((s) => (
          <Card key={s.status} className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                {s.status.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </p>
              <p className="text-2xl font-bold mt-0.5">{s._count.id}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Ticket trend */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tickets — last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="created" name="Created" fill="#94b4d4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="done" name="Done" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
                />
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tickets by type */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">By ticket type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeBarData} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" name="Count" radius={[0, 3, 3, 0]}>
                  {typeBarData.map((_, i) => (
                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team workload */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Team workload (open tickets)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamWorkload.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              teamWorkload.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <UserAvatar user={u} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm truncate">{u.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {u._count.assignedTickets}
                      </span>
                    </div>
                    <Progress
                      value={(u._count.assignedTickets / maxWorkload) * 100}
                      className="h-1.5"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
