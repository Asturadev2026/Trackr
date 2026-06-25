"use client"

import { useState, useRef } from "react"
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
  X,
  Clock,
  Edit2,
  Check,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
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
  userRole?: string
}

export function TicketDetailClient({ ticket, projectMembers, isWatching, currentUserId, userRole }: Props) {
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [watching, setWatching] = useState(isWatching)
  const [status, setStatus] = useState(ticket.status)
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId ?? "unassigned")
  const [priority, setPriority] = useState(ticket.priority)
  const [localComments, setLocalComments] = useState(ticket.comments)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<{ name: string; type: string; data: string } | null>(null)
  const [attachments, setAttachments] = useState(ticket.attachments)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; type: string; url: string } | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [estimatedHours, setEstimatedHours] = useState(ticket.estimatedHours ?? 0)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState(ticket.description ?? "")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user can edit description (admin or assigned person)
  const canEditDescription = userRole === "ADMIN" || ticket.assigneeId === currentUserId

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

  const updateEstimatedHours = async () => {
    const normalizedHours = Number.isFinite(estimatedHours) ? Math.max(0, Math.floor(estimatedHours)) : 0
    setEstimatedHours(normalizedHours)

    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimatedHours: normalizedHours }),
      })
      if (!res.ok) throw new Error()
      toast.success("Estimated hours updated")
    } catch {
      toast.error("Failed to update estimated hours")
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error("File type not supported. Please upload an image, PDF, or document.")
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB")
      return
    }

    setUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result as string
        setPreview({
          name: file.name,
          type: file.type,
          data,
        })
      }
      reader.readAsDataURL(file)

      // Upload file
      const formData = new FormData()
      formData.append("file", file)
      formData.append("ticketId", ticket.id)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Upload failed")

      const attachment = await res.json()
      setAttachments((prev) => [...prev, attachment])
      setUploadedFile({
        name: attachment.name,
        size: attachment.size,
        type: attachment.mimeType,
        url: attachment.url,
      })
      setShowUploadDialog(true)
      setPreview(null)

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      console.error("Upload error:", err)
      toast.error("Failed to upload file")
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const isImageFile = (type: string) => type.startsWith("image/")
  const isPdf = (type: string) => type === "application/pdf"

  const updateDescription = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editedDescription }),
      })
      if (!res.ok) throw new Error()
      setEditingDescription(false)
      toast.success("Description updated")
    } catch {
      toast.error("Failed to update description")
    }
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      {/* Upload Success Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>File Uploaded Successfully</DialogTitle>
            <DialogDescription>
              Your file has been attached to this ticket
            </DialogDescription>
          </DialogHeader>
          {uploadedFile && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {isImageFile(uploadedFile.type) && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center">
                        <Paperclip className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  )}
                  {isPdf(uploadedFile.type) && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center">
                        <Paperclip className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                  )}
                  {!isImageFile(uploadedFile.type) && !isPdf(uploadedFile.type) && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                        <Paperclip className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    window.open(uploadedFile.url, "_blank")
                    setShowUploadDialog(false)
                  }}
                >
                  View File
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Description</h3>
                  <div className="flex items-center gap-2">
                    {canEditDescription && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (editingDescription) {
                            updateDescription()
                          } else {
                            setEditingDescription(true)
                          }
                        }}
                        className="h-7 text-xs"
                      >
                        {editingDescription ? (
                          <><Check className="h-3.5 w-3.5 mr-1.5" />Save</>
                        ) : (
                          <><Edit2 className="h-3.5 w-3.5 mr-1.5" />Edit</>
                        )}
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      disabled={uploading}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="h-7 text-xs"
                    >
                      {uploading ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Uploading...</>
                      ) : (
                        <><Paperclip className="h-3.5 w-3.5 mr-1.5" />Attach file</>
                      )}
                    </Button>
                  </div>
                </div>
                {editingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="min-h-32 text-sm"
                      placeholder="Enter description..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingDescription(false)
                          setEditedDescription(ticket.description ?? "")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={updateDescription}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-sm text-foreground whitespace-pre-wrap">
                    {ticket.description}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* File Preview */}
          {preview && (
            <Card className="shadow-none border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold">Preview</h3>
                  <button
                    onClick={() => setPreview(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    <strong>File:</strong> {preview.name}
                  </p>
                  {isImageFile(preview.type) && (
                    <div className="mt-3">
                      <img
                        src={preview.data}
                        alt={preview.name}
                        className="max-h-64 max-w-full rounded-md border"
                      />
                    </div>
                  )}
                  {isPdf(preview.type) && (
                    <div className="mt-3 p-4 bg-gray-100 rounded-md flex items-center gap-2">
                      <Paperclip className="h-5 w-5 text-red-500" />
                      <span className="text-sm text-muted-foreground">PDF Document</span>
                    </div>
                  )}
                  {!isImageFile(preview.type) && !isPdf(preview.type) && (
                    <div className="mt-3 p-4 bg-gray-100 rounded-md flex items-center gap-2">
                      <Paperclip className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Document</span>
                    </div>
                  )}
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

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Estimated hours</p>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.valueAsNumber || 0)}
                    onBlur={updateEstimatedHours}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur()
                      }
                    }}
                    className="h-8 pl-8"
                    aria-label="Estimated hours"
                  />
                </div>
              </div>

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

              {attachments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Attachments</p>
                    <div className="space-y-1.5">
                      {attachments.map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-md border text-xs hover:bg-muted transition-colors group"
                        >
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-foreground group-hover:underline flex-1 truncate">
                            {a.name}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
