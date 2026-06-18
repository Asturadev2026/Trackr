"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Trash2, UserPlus, UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Separator } from "@/components/ui/separator"

const schema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "DELAYED", "AT_RISK", "COMPLETED", "CANCELLED"]),
  dueDate: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Member {
  id: string
  role: string
  user: { id: string; name: string | null; email: string; image: string | null; role: string }
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  dueDate: string | null
  members: Member[]
}

export function ProjectSettingsClient({ project: initial }: { project: Project }) {
  const router = useRouter()
  const [project, setProject] = useState(initial)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("AI_ENGINEER")

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
      status: project.status as FormData["status"],
      dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split("T")[0] : "",
    },
  })

  const onSave = async (data: FormData) => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, dueDate: data.dueDate || null }),
      })
      if (!res.ok) throw new Error()
      setProject((p) => ({ ...p, ...data }))
      toast.success("Project updated")
    } catch {
      toast.error("Failed to update project")
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/members?userId=${userId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setProject((p) => ({ ...p, members: p.members.filter((m) => m.user.id !== userId) }))
      toast.success("Member removed")
    } catch {
      toast.error("Failed to remove member")
    }
  }

  const handleAddMember = async () => {
    if (!inviteEmail.trim()) return
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error ?? "Failed")
      }
      const updated = await res.json()
      setProject((p) => ({ ...p, members: updated.members }))
      setInviteEmail("")
      toast.success("Member added")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add member")
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Project deleted")
      router.push("/projects")
    } catch {
      toast.error("Failed to delete project")
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Project Settings</h1>
        <Button
          variant="destructive"
          size="sm"
          className="h-8 gap-1"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete Project
        </Button>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">General</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Project name</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input {...form.register("description")} placeholder="Short description..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  defaultValue={project.status}
                  onValueChange={(v) => form.setValue("status", v as FormData["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["PLANNING", "ACTIVE", "ON_HOLD", "DELAYED", "AT_RISK", "COMPLETED", "CANCELLED"].map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" {...form.register("dueDate")} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Team members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y divide-border">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <UserAvatar user={m.user} size="sm" />
                  <div>
                    <p className="text-sm font-medium">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveMember(m.user.id)}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs font-medium">Add member by email</Label>
            <div className="flex gap-2">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@company.com"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="SENIOR_ENGINEER">Senior Engineer</SelectItem>
                  <SelectItem value="AI_ENGINEER">AI Engineer</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                  <SelectItem value="INTERN">Intern</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="shrink-0 gap-1" onClick={handleAddMember}>
                <UserPlus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
