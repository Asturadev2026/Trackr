"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  type: z.enum(["BUG", "FEATURE", "TASK", "IMPROVEMENT", "QUESTION"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  projectId: z.string().min(1, "Project is required"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultProjectId?: string
  onSuccess?: () => void
}

export function CreateTicketDialog({ open, onOpenChange, defaultProjectId, onSuccess }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [members, setMembers] = useState<{ id: string; name: string | null }[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "TASK",
      priority: "MEDIUM",
      projectId: defaultProjectId ?? "",
    },
  })

  const watchProjectId = watch("projectId")

  useEffect(() => {
    if (!open) return
    fetch("/api/projects?simple=1")
      .then((r) => r.json())
      .then((d) => setProjects(d.data ?? []))
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!watchProjectId) return
    fetch(`/api/projects/${watchProjectId}/members`)
      .then((r) => r.json())
      .then((d) => setMembers(d ?? []))
      .catch(() => {})
  }, [watchProjectId])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      const ticket = await res.json()
      toast.success("Ticket created!")
      reset({ type: "TASK", priority: "MEDIUM", projectId: defaultProjectId ?? "" })
      onOpenChange(false)
      onSuccess?.()
      router.push(`/tickets/${ticket.id}`)
    } catch {
      toast.error("Failed to create ticket")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create new ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Short descriptive title..."
              {...register("title")}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select defaultValue="TASK" onValueChange={(v) => setValue("type", v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUG">Bug</SelectItem>
                  <SelectItem value="FEATURE">Feature</SelectItem>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="IMPROVEMENT">Improvement</SelectItem>
                  <SelectItem value="QUESTION">Question</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select defaultValue="MEDIUM" onValueChange={(v) => setValue("priority", v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Project *</Label>
              <Select
                defaultValue={defaultProjectId}
                onValueChange={(v) => setValue("projectId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-xs text-destructive">{errors.projectId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select onValueChange={(v) => setValue("assigneeId", v === "unassigned" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the ticket in detail..."
              rows={4}
              {...register("description")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
