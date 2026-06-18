"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, CalendarDays, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { cn, formatDate } from "@/lib/utils"
import Link from "next/link"
import { UserAvatar } from "@/components/shared/user-avatar"

const schema = z.object({
  name: z.string().min(1, "Name required"),
  projectId: z.string().min(1, "Project required"),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  goal: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface SprintItem {
  id: string
  ticket: {
    id: string
    ticketKey: string
    title: string
    status: string
    priority: string
    type: string
    assignee: { id: string; name: string | null; image: string | null } | null
  }
}

interface Sprint {
  id: string
  name: string
  status: string
  startDate: string
  endDate: string
  goal: string | null
  project: { id: string; name: string }
  items: SprintItem[]
}

interface Props {
  sprints: Sprint[]
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PLANNED: "outline",
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
}

export function SprintsClient({ sprints: initialSprints }: Props) {
  const router = useRouter()
  const [sprints, setSprints] = useState(initialSprints)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(sprints.filter((s) => s.status === "ACTIVE").map((s) => s.id)))

  const form = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      const sprint = await res.json()
      setSprints((prev) => [sprint, ...prev])
      setOpen(false)
      form.reset()
      toast.success("Sprint created")
    } catch {
      toast.error("Failed to create sprint")
    }
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const activeSprints = sprints.filter((s) => s.status === "ACTIVE")
  const otherSprints = sprints.filter((s) => s.status !== "ACTIVE")

  const SprintCard = ({ sprint }: { sprint: Sprint }) => {
    const isExpanded = expanded.has(sprint.id)
    const done = sprint.items.filter((i) => i.ticket.status === "DONE").length
    const total = sprint.items.length
    const pct = total ? Math.round((done / total) * 100) : 0

    return (
      <Card className="shadow-none">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleExpand(sprint.id)}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-sm font-semibold">{sprint.name}</CardTitle>
                  <Badge variant={STATUS_VARIANT[sprint.status] ?? "outline"} className="text-[10px]">
                    {sprint.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sprint.project.name} · {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">{pct}%</p>
              <p className="text-xs text-muted-foreground">{done}/{total}</p>
            </div>
          </div>
          {sprint.goal && (
            <p className="text-xs text-muted-foreground ml-6 mt-1">{sprint.goal}</p>
          )}
        </CardHeader>
        {isExpanded && (
          <CardContent className="pt-0">
            {sprint.items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No tickets in this sprint</p>
            ) : (
              <div className="divide-y divide-border">
                {sprint.items.map(({ ticket }) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    className="flex items-center justify-between py-2 hover:bg-muted/30 px-1 rounded text-sm gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{ticket.ticketKey}</span>
                      <span className="truncate">{ticket.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{ticket.status.replace("_", " ")}</Badge>
                      {ticket.assignee && <UserAvatar user={ticket.assignee} size="xs" />}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Sprints</h1>
        <Button size="sm" className="h-8" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Sprint
        </Button>
      </div>

      {activeSprints.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active</h2>
          {activeSprints.map((s) => <SprintCard key={s.id} sprint={s} />)}
        </div>
      )}

      {otherSprints.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">All sprints</h2>
          {otherSprints.map((s) => <SprintCard key={s.id} sprint={s} />)}
        </div>
      )}

      {sprints.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No sprints yet. Create your first sprint to start planning.</p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Sprint</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Sprint name</Label>
              <Input {...form.register("name")} placeholder="Sprint 1" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Project ID</Label>
              <Input {...form.register("projectId")} placeholder="Project ID" />
              {form.formState.errors.projectId && (
                <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input type="date" {...form.register("startDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>End date</Label>
                <Input type="date" {...form.register("endDate")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sprint goal (optional)</Label>
              <Input {...form.register("goal")} placeholder="Goal of this sprint..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>Create sprint</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
