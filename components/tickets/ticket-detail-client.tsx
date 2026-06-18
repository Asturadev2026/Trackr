"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ChevronRight,
  Paperclip,
  Eye,
  EyeOff,
  Calendar,
  Tag,
  Loader2,
  MoreHorizontal,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MentionTextarea, renderMentions } from "@/components/tickets/mention-textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TicketTypeBadge } from "@/components/shared/ticket-type-badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { formatDate, formatRelativeTime, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { TicketDetail } from "@/types"

interface Props {
  ticket: TicketDetail
  projectMembers: { id: string; name: string | null; image: string | null }[]
  isWatching: boolean
  currentUserId: string
}

export function TicketDetailClient({ ticket, projectMembers, isWatching, currentUserId }: Props) {
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [watching, setWatching] = useState(isWatching)
  const [status, setStatus] = useState(ticket.status)
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId ?? "unassigned")
  const [priority, setPriority] = useState(ticket.priority)
  const [localComments, setLocalComments] = useState(ticket.comments)

  const updateField = async (field: string, value: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value === "unassigned" ? null : value }),
      })
      if (!res.ok) throw new Error()
      toast.success("Updated")
    } catch {
      toast.error("Failed to update")
    }
  }

  const submitComment = async () => {
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      })
      if (!res.ok) throw new Error()
      const newComment = await res.json()
      setLocalComments((prev) => [...prev, newComment])
      setComment("")
      toast.success("Comment added")
    } catch {
      toast.error("Failed to add comment")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleWatch = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/watch`, {
        method: watching ? "DELETE" : "POST",
      })
      if (!res.ok) throw new Error()
      setWatching(!watching)
      toast.success(watching ? "Unwatched ticket" : "Watching ticket")
    } catch {
      toast.error("Failed to update watch status")
    }
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/tickets" className="hover:text-foreground transition-colors">Tickets</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/projects/${ticket.projectId}`} className="hover:text-foreground transition-colors">
          {ticket.project.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono text-foreground">{ticket.ticketKey}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ticket header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TicketTypeBadge type={ticket.type} />
              <span className="text-sm font-mono text-muted-foreground">{ticket.ticketKey}</span>
            </div>
            <h1 className="text-xl font-bold">{ticket.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>Reported by <strong>{ticket.reporter.name}</strong></span>
              <span>·</span>
              <span>{formatRelativeTime(ticket.createdAt)}</span>
            </div>
          </div>

          {/* Description */}
          {ticket.description && (
            <Card className="shadow-none">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Description</h3>
                <div className="prose prose-sm max-w-none text-sm text-foreground whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {ticket.attachments.length > 0 && (
            <Card className="shadow-none">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({ticket.attachments.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                    >
                      <Paperclip className="h-3 w-3" />
                      {a.name}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity & Comments */}
          <Card className="shadow-none">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-4">Activity</h3>
              <div className="space-y-4">
                {/* Activity logs */}
                {ticket.activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5">
                    <UserAvatar user={log.user} size="sm" className="mt-0.5" />
                    <div className="flex-1 text-xs">
                      <span className="font-medium">{log.user.name}</span>{" "}
                      <span className="text-muted-foreground">{log.action}</span>
                      {log.field && (
                        <span className="text-muted-foreground">
                          {" "}<strong>{log.field}</strong>
                          {log.oldValue && ` from ${log.oldValue}`}
                          {log.newValue && ` to ${log.newValue}`}
                        </span>
                      )}
                      <span className="text-muted-foreground ml-1">
                        · {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Comments */}
                {localComments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <UserAvatar user={c.author} size="sm" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-foreground whitespace-pre-wrap leading-relaxed">
                        {renderMentions(c.content)}
                      </p>
                    </div>
                  </div>
                ))}

                {ticket.activityLogs.length === 0 && localComments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity yet
                  </p>
                )}
              </div>

              <Separator className="my-4" />

              {/* Add comment */}
              <div className="space-y-2">
                <MentionTextarea
                  placeholder="Write a comment… type @ to mention someone"
                  rows={3}
                  value={comment}
                  onChange={setComment}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment()
                  }}
                  users={projectMembers}
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={submitComment} disabled={submitting || !comment.trim()}>
                    {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Comment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar details */}
        <div className="space-y-4">
          <Card className="shadow-none">
            <CardContent className="p-4 space-y-4">
              {/* Status */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Status</p>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v as any)
                    updateField("status", v)
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                    <SelectItem value="IN_REVIEW">In review</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Assignee */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Assignee</p>
                <Select
                  value={assigneeId}
                  onValueChange={(v) => {
                    setAssigneeId(v)
                    updateField("assigneeId", v)
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {projectMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reporter */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Reporter</p>
                <div className="flex items-center gap-2">
                  <UserAvatar user={ticket.reporter} size="sm" />
                  <span className="text-sm">{ticket.reporter.name}</span>
                </div>
              </div>

              <Separator />

              {/* Priority */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Priority</p>
                <Select
                  value={priority}
                  onValueChange={(v) => {
                    setPriority(v as any)
                    updateField("priority", v)
                  }}
                >
                  <SelectTrigger className="h-8">
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

              {/* Due date */}
              {ticket.dueDate && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Due date</p>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(ticket.dueDate)}
                  </div>
                </div>
              )}

              {/* Labels */}
              {ticket.labels.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {ticket.labels.map((l) => (
                      <Badge key={l} variant="secondary" className="text-xs">
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Watchers */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Watchers</p>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {ticket.watchers.slice(0, 5).map((w) => (
                      <UserAvatar key={w.userId} user={w.user} size="xs" className="ring-2 ring-background" />
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleWatch}>
                    {watching ? (
                      <><EyeOff className="h-3.5 w-3.5 mr-1" />Unwatch</>
                    ) : (
                      <><Eye className="h-3.5 w-3.5 mr-1" />Watch</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
