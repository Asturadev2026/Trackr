"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Settings,
  ChevronRight,
  Plus,
  Calendar,
  Check,
  Pencil,
  Trash2,
  X,
  Loader2,
  UserPlus,
  UserMinus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserAvatar } from "@/components/shared/user-avatar"
import { StatusBadge } from "@/components/shared/status-badge"
import { TicketTypeBadge } from "@/components/shared/ticket-type-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn, PROJECT_STATUS_COLORS, PROJECT_PROGRESS_COLOR, formatDate } from "@/lib/utils"
import type { TicketWithRelations } from "@/types"

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  DONE: "Done",
  DELAYED: "Delayed",
  AT_RISK: "At risk",
}

const PHASE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  ACTIVE: "bg-primary/10 text-primary",
  DONE: "bg-green-100 text-green-700",
}

interface WorkflowSubStep {
  id: string
  name: string
  order: number
  done: boolean
}

interface WorkflowStep {
  id: string
  name: string
  order: number
  done: boolean
  subSteps: WorkflowSubStep[]
}

interface PlatformUser {
  id: string
  name: string | null
  image: string | null
  email: string
  role: string
}

interface Props {
  project: any
  stats: { total: number; done: number; open: number; inProgress: number }
  recentTickets: TicketWithRelations[]
  allTickets: TicketWithRelations[]
  platformUsers: PlatformUser[]
  userId: string
}

export function ProjectDetailClient({ project, stats, recentTickets, allTickets, platformUsers, userId }: Props) {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()

  // ── Team / member state ───────────────────────────────────────────────────
  const [members, setMembers] = useState<any[]>(project.members ?? [])
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedRole, setSelectedRole] = useState("DEVELOPER")
  const [addingMember, setAddingMember] = useState(false)

  const memberIds = new Set(members.map((m: any) => m.userId))
  const availableUsers = platformUsers.filter((u) => !memberIds.has(u.id))

  const addMember = async () => {
    if (!selectedUserId) return
    setAddingMember(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
      })
      if (!res.ok) throw new Error()
      const user = platformUsers.find((u) => u.id === selectedUserId)!
      setMembers((prev) => [...prev, { userId: selectedUserId, role: selectedRole, user }])
      setSelectedUserId("")
      setSelectedRole("DEVELOPER")
      setShowAddMember(false)
      toast.success(`${user.name} added to project`)
    } catch {
      toast.error("Failed to add member")
    } finally {
      setAddingMember(false)
    }
  }

  const removeMember = async (memberId: string) => {
    const prev = members
    setMembers(members.filter((m: any) => m.userId !== memberId))
    try {
      const res = await fetch(`/api/projects/${project.id}/members?userId=${memberId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Member removed")
    } catch {
      setMembers(prev)
      toast.error("Failed to remove member")
    }
  }

  // ── Progress state ────────────────────────────────────────────────────────
  const [progress, setProgress] = useState<number>(project.progress ?? 0)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressInput, setProgressInput] = useState(String(project.progress ?? 0))
  const [savingProgress, setSavingProgress] = useState(false)

  const saveProgress = async (val: number) => {
    const clamped = Math.max(0, Math.min(100, val))
    setSavingProgress(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: clamped }),
      })
      if (!res.ok) throw new Error()
      setProgress(clamped)
      setEditingProgress(false)
      toast.success("Progress updated")
    } catch {
      toast.error("Failed to update progress")
    } finally {
      setSavingProgress(false)
    }
  }

  // ── Workflow state ────────────────────────────────────────────────────────
  const [steps, setSteps] = useState<WorkflowStep[]>(project.workflowSteps ?? [])
  const [newStepName, setNewStepName] = useState("")
  const [addingStep, setAddingStep] = useState(false)
  const [showAddStep, setShowAddStep] = useState(false)
  const newStepRef = useRef<HTMLInputElement>(null)
  // editing step names
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editingStepName, setEditingStepName] = useState("")
  // sub-steps
  const [showAddSub, setShowAddSub] = useState<string | null>(null) // stepId
  const [newSubName, setNewSubName] = useState("")
  const [addingSub, setAddingSub] = useState(false)
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editingSubName, setEditingSubName] = useState("")

  const toggleStep = async (step: WorkflowStep) => {
    const optimistic = steps.map((s) => s.id === step.id ? { ...s, done: !s.done } : s)
    setSteps(optimistic)
    try {
      const res = await fetch(`/api/projects/${project.id}/workflow/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !step.done }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setSteps(steps)
      toast.error("Failed to update step")
    }
  }

  const saveStepName = async (stepId: string) => {
    const name = editingStepName.trim()
    if (!name) { setEditingStepId(null); return }
    const prev = steps
    setSteps(steps.map((s) => s.id === stepId ? { ...s, name } : s))
    setEditingStepId(null)
    try {
      const res = await fetch(`/api/projects/${project.id}/workflow/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setSteps(prev)
      toast.error("Failed to rename step")
    }
  }

  const addStep = async () => {
    if (!newStepName.trim()) return
    setAddingStep(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStepName.trim() }),
      })
      if (!res.ok) throw new Error()
      const step = await res.json()
      setSteps((prev) => [...prev, { ...step, subSteps: [] }])
      setNewStepName("")
      setShowAddStep(false)
    } catch {
      toast.error("Failed to add step")
    } finally {
      setAddingStep(false)
    }
  }

  const deleteStep = async (stepId: string) => {
    const prev = steps
    setSteps(steps.filter((s) => s.id !== stepId))
    try {
      const res = await fetch(`/api/projects/${project.id}/workflow/${stepId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      setSteps(prev)
      toast.error("Failed to delete step")
    }
  }

  const toggleSub = async (stepId: string, sub: WorkflowSubStep) => {
    setSteps(steps.map((s) =>
      s.id === stepId
        ? { ...s, subSteps: s.subSteps.map((ss) => ss.id === sub.id ? { ...ss, done: !ss.done } : ss) }
        : s
    ))
    try {
      const res = await fetch(`/api/projects/${project.id}/workflow/${stepId}/substeps/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !sub.done }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error("Failed to update sub-step")
    }
  }

  const saveSubName = async (stepId: string, subId: string) => {
    const name = editingSubName.trim()
    if (!name) { setEditingSubId(null); return }
    setSteps(steps.map((s) =>
      s.id === stepId
        ? { ...s, subSteps: s.subSteps.map((ss) => ss.id === subId ? { ...ss, name } : ss) }
        : s
    ))
    setEditingSubId(null)
    try {
      await fetch(`/api/projects/${project.id}/workflow/${stepId}/substeps/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
    } catch {
      toast.error("Failed to rename sub-step")
    }
  }

  const addSub = async (stepId: string) => {
    if (!newSubName.trim()) return
    setAddingSub(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/workflow/${stepId}/substeps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubName.trim() }),
      })
      if (!res.ok) throw new Error()
      const sub = await res.json()
      setSteps(steps.map((s) => s.id === stepId ? { ...s, subSteps: [...s.subSteps, sub] } : s))
      setNewSubName("")
      setShowAddSub(null)
    } catch {
      toast.error("Failed to add sub-step")
    } finally {
      setAddingSub(false)
    }
  }

  const deleteSub = async (stepId: string, subId: string) => {
    setSteps(steps.map((s) =>
      s.id === stepId ? { ...s, subSteps: s.subSteps.filter((ss) => ss.id !== subId) } : s
    ))
    try {
      await fetch(`/api/projects/${project.id}/workflow/${stepId}/substeps/${subId}`, { method: "DELETE" })
    } catch {
      toast.error("Failed to delete sub-step")
    }
  }

  const doneCount = steps.filter((s) => s.done).length

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground transition-colors">
            Projects
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{project.name}</span>
        </div>

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge variant="outline" className={cn("text-xs", PROJECT_STATUS_COLORS[project.status])}>
                {STATUS_LABELS[project.status]}
              </Badge>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}/settings`}>
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
          </TabsList>

          {/* ── Overview tab ──────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

              {/* Left column */}
              <div className="lg:col-span-2 space-y-4">

                {/* Progress */}
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Progress</CardTitle>
                      {!editingProgress && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setProgressInput(String(progress))
                            setEditingProgress(true)
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {editingProgress ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="h-8 w-24 text-sm"
                            value={progressInput}
                            onChange={(e) => setProgressInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveProgress(parseInt(progressInput) || 0)
                              if (e.key === "Escape") setEditingProgress(false)
                            }}
                            autoFocus
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          <div className="flex-1" />
                          <Button
                            size="sm"
                            className="h-7"
                            onClick={() => saveProgress(parseInt(progressInput) || 0)}
                            disabled={savingProgress}
                          >
                            {savingProgress ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => setEditingProgress(false)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {/* Live preview slider */}
                        <div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={parseInt(progressInput) || 0}
                            onChange={(e) => setProgressInput(e.target.value)}
                            className="w-full accent-primary"
                          />
                          <Progress
                            value={parseInt(progressInput) || 0}
                            className="h-2 mt-1"
                            indicatorClassName={cn(PROJECT_PROGRESS_COLOR[project.status] ?? "bg-primary")}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground font-medium text-base">{progress}% complete</span>
                        </div>
                        <Progress
                          value={progress}
                          className="h-3"
                          indicatorClassName={cn(PROJECT_PROGRESS_COLOR[project.status] ?? "bg-primary")}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Workflow */}
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">Workflow</CardTitle>
                        {steps.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {doneCount}/{steps.length} done
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          setShowAddStep(true)
                          setTimeout(() => newStepRef.current?.focus(), 50)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add step
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 pb-3">
                    {/* Progress bar for workflow */}
                    {steps.length > 0 && (
                      <div className="mb-3">
                        <Progress
                          value={steps.length > 0 ? (doneCount / steps.length) * 100 : 0}
                          className="h-1.5"
                          indicatorClassName="bg-green-500"
                        />
                      </div>
                    )}

                    {steps.length === 0 && !showAddStep && (
                      <p className="text-xs text-muted-foreground py-2">
                        No workflow steps yet. Add steps to track your project pipeline.
                      </p>
                    )}

                    {steps.map((step) => (
                      <div key={step.id} className="group">
                        {/* Step row */}
                        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors">
                          <button
                            onClick={() => toggleStep(step)}
                            className={cn(
                              "shrink-0 h-4 w-4 rounded border transition-colors flex items-center justify-center",
                              step.done
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-muted-foreground/40 hover:border-primary"
                            )}
                          >
                            {step.done && <Check className="h-3 w-3" />}
                          </button>

                          {editingStepId === step.id ? (
                            <Input
                              value={editingStepName}
                              onChange={(e) => setEditingStepName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveStepName(step.id)
                                if (e.key === "Escape") setEditingStepId(null)
                              }}
                              onBlur={() => saveStepName(step.id)}
                              className="h-7 text-sm flex-1"
                              autoFocus
                            />
                          ) : (
                            <span
                              className="flex-1 text-sm cursor-text"
                              onDoubleClick={() => { setEditingStepId(step.id); setEditingStepName(step.name) }}
                            >
                              {step.name}
                            </span>
                          )}

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingStepId(step.id); setEditingStepName(step.name) }}
                              className="text-muted-foreground hover:text-foreground"
                              title="Rename"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => { setShowAddSub(showAddSub === step.id ? null : step.id); setNewSubName("") }}
                              className="text-muted-foreground hover:text-foreground"
                              title="Add sub-step"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteStep(step.id)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Sub-steps — always show if any exist OR add is open */}
                        <div className="ml-7 mt-0.5 space-y-0.5 border-l-2 border-muted pl-3">
                            {step.subSteps.map((sub) => (
                              <div key={sub.id} className="flex items-center gap-2 group/sub rounded px-2 py-1 hover:bg-muted/30 transition-colors">
                                <button
                                  onClick={() => toggleSub(step.id, sub)}
                                  className={cn(
                                    "shrink-0 h-3.5 w-3.5 rounded border transition-colors flex items-center justify-center",
                                    sub.done
                                      ? "bg-green-500 border-green-500 text-white"
                                      : "border-muted-foreground/40 hover:border-primary"
                                  )}
                                >
                                  {sub.done && <Check className="h-2.5 w-2.5" />}
                                </button>

                                {editingSubId === sub.id ? (
                                  <Input
                                    value={editingSubName}
                                    onChange={(e) => setEditingSubName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveSubName(step.id, sub.id)
                                      if (e.key === "Escape") setEditingSubId(null)
                                    }}
                                    onBlur={() => saveSubName(step.id, sub.id)}
                                    className="h-6 text-xs flex-1"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    className="flex-1 text-xs cursor-text"
                                    onDoubleClick={() => { setEditingSubId(sub.id); setEditingSubName(sub.name) }}
                                  >
                                    {sub.name}
                                  </span>
                                )}

                                <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { setEditingSubId(sub.id); setEditingSubName(sub.name) }}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Pencil className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteSub(step.id, sub.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {showAddSub === step.id ? (
                              <div className="flex items-center gap-2 pt-0.5">
                                <Input
                                  placeholder="Sub-step name…"
                                  value={newSubName}
                                  onChange={(e) => setNewSubName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") addSub(step.id)
                                    if (e.key === "Escape") { setShowAddSub(null); setNewSubName("") }
                                  }}
                                  className="h-7 text-xs"
                                  autoFocus
                                />
                                <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => addSub(step.id)} disabled={addingSub || !newSubName.trim()}>
                                  {addingSub ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Add"}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => { setShowAddSub(null); setNewSubName("") }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setShowAddSub(step.id); setNewSubName("") }}
                                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors py-0.5"
                              >
                                <Plus className="h-3 w-3" /> Add sub-step
                              </button>
                            )}
                          </div>
                      </div>
                    ))}

                    {/* Add step input */}
                    {showAddStep && (
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          ref={newStepRef}
                          placeholder="Step name…"
                          value={newStepName}
                          onChange={(e) => setNewStepName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addStep()
                            if (e.key === "Escape") { setShowAddStep(false); setNewStepName("") }
                          }}
                          className="h-8 text-sm"
                        />
                        <Button size="sm" className="h-8 px-3" onClick={addStep} disabled={addingStep || !newStepName.trim()}>
                          {addingStep ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setShowAddStep(false); setNewStepName("") }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Phases */}
                {project.phases.length > 0 && (
                  <Card className="shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Phases</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {project.phases.map((phase: any) => (
                        <div key={phase.id} className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            phase.status === "DONE" ? "bg-green-500" :
                            phase.status === "ACTIVE" ? "bg-primary" : "bg-muted-foreground/30"
                          )} />
                          <span className="flex-1 text-sm">{phase.name}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", PHASE_STATUS_COLORS[phase.status])}>
                            {phase.status.charAt(0) + phase.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Recent tickets */}
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Recent tickets</CardTitle>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveTab("tickets")}>
                        View all
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentTickets.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6 px-6">No tickets yet</p>
                    ) : (
                      <div className="divide-y">
                        {recentTickets.map((t) => (
                          <Link
                            key={t.id}
                            href={`/tickets/${t.id}`}
                            className="flex items-center gap-3 px-6 py-2.5 hover:bg-muted/50 transition-colors"
                          >
                            <TicketTypeBadge type={t.type} />
                            <span className="flex-1 text-sm truncate">{t.title}</span>
                            <StatusBadge status={t.status} />
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Details */}
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Owner</span>
                      <div className="flex items-center gap-1.5">
                        <UserAvatar user={project.owner} size="xs" />
                        <span className="font-medium">{project.owner.name}</span>
                      </div>
                    </div>
                    {project.dueDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Due date</span>
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(project.dueDate)}
                        </span>
                      </div>
                    )}
                    {project.startDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Start date</span>
                        <span className="font-medium">{formatDate(project.startDate)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Team */}
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">Team</CardTitle>
                        <span className="text-xs text-muted-foreground">{members.length} members</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => { setShowAddMember(!showAddMember); setSelectedUserId("") }}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {members.map((m: any) => (
                      <div key={m.userId} className="flex items-center gap-2 group">
                        <UserAvatar user={m.user} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.user.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {m.role.toLowerCase().replace("_", " ")}
                          </p>
                        </div>
                        {m.userId !== project.ownerId && (
                          <button
                            onClick={() => removeMember(m.userId)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            title="Remove from project"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    {showAddMember && (
                      <div className="border-t pt-3 space-y-2">
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select team member…" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground">All users are already members</div>
                            ) : (
                              availableUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  <div className="flex items-center gap-2">
                                    <UserAvatar user={u} size="xs" />
                                    <span>{u.name}</span>
                                    <span className="text-xs text-muted-foreground">· {u.email}</span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                            <SelectItem value="DEVELOPER">Developer</SelectItem>
                            <SelectItem value="DESIGNER">Designer</SelectItem>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 flex-1"
                            onClick={addMember}
                            disabled={addingMember || !selectedUserId}
                          >
                            {addingMember ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Add to project
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => { setShowAddMember(false); setSelectedUserId("") }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── Tickets tab ───────────────────────────────────────────────── */}
          <TabsContent value="tickets" className="mt-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total", value: stats.total },
                { label: "Open", value: stats.open },
                { label: "In progress", value: stats.inProgress },
                { label: "Done", value: stats.done },
              ].map((s) => (
                <Card key={s.label} className="shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold mt-0.5">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end mb-3">
              <Button size="sm" asChild>
                <Link href={`/tickets/new?project=${project.id}`}>
                  <Plus className="h-4 w-4" />
                  New ticket
                </Link>
              </Button>
            </div>

            <Card className="shadow-none">
              <CardContent className="p-0">
                {allTickets.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">No tickets yet</p>
                ) : (
                  <div className="divide-y">
                    {allTickets.map((t) => (
                      <Link
                        key={t.id}
                        href={`/tickets/${t.id}`}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <TicketTypeBadge type={t.type} />
                        <span className="flex-1 text-sm font-medium truncate">{t.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <PriorityBadge priority={t.priority} />
                          <StatusBadge status={t.status} />
                          {t.assignee && <UserAvatar user={t.assignee} size="xs" showTooltip />}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
