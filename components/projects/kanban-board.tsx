"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { TicketTypeBadge } from "@/components/shared/ticket-type-badge"
import { CreateTicketDialog } from "@/components/tickets/create-ticket-dialog"
import Link from "next/link"
import type { TicketWithRelations, TicketStatus } from "@/types"

const COLUMNS: { id: TicketStatus; label: string }[] = [
  { id: "OPEN", label: "To do" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "IN_REVIEW", label: "In review" },
  { id: "DONE", label: "Done" },
]

const COLUMN_COLORS: Record<TicketStatus, string> = {
  OPEN: "bg-slate-100",
  IN_PROGRESS: "bg-blue-50",
  IN_REVIEW: "bg-amber-50",
  DONE: "bg-green-50",
  CANCELLED: "bg-slate-50",
}

export function KanbanBoard({ projectId }: { projectId: string }) {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/tickets?projectId=${projectId}&pageSize=100`)
      const data = await res.json()
      setTickets(data.data ?? [])
    } catch {
      toast.error("Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTickets() }, [projectId])

  const grouped = COLUMNS.reduce<Record<string, TicketWithRelations[]>>((acc, col) => {
    acc[col.id] = tickets.filter((t) => t.status === col.id)
    return acc
  }, {} as Record<string, TicketWithRelations[]>)

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId as TicketStatus
    setTickets((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    )

    try {
      await fetch(`/api/tickets/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      toast.error("Failed to update ticket status")
      fetchTickets()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{tickets.length} tickets total</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Filter</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New ticket
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-72">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{col.label}</span>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                    {grouped[col.id]?.length ?? 0}
                  </span>
                </div>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-24 rounded-xl p-2 space-y-2 transition-colors ${
                      snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : COLUMN_COLORS[col.id]
                    }`}
                  >
                    {(grouped[col.id] ?? []).map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style as React.CSSProperties}
                          >
                            <Link href={`/tickets/${ticket.id}`}>
                              <Card
                                className={`shadow-none cursor-pointer hover:shadow-sm transition-shadow ${
                                  snapshot.isDragging ? "shadow-md rotate-1" : ""
                                }`}
                              >
                                <CardContent className="p-3">
                                  <TicketTypeBadge type={ticket.type} />
                                  <p className="text-sm font-medium mt-1.5 line-clamp-2">
                                    {ticket.title}
                                  </p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {ticket.ticketKey}
                                    </span>
                                    {ticket.assignee && (
                                      <UserAvatar user={ticket.assignee} size="xs" showTooltip />
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultProjectId={projectId}
        onSuccess={fetchTickets}
      />
    </>
  )
}
