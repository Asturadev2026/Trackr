"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { TicketTypeBadge } from "@/components/shared/ticket-type-badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { PriorityBadge } from "@/components/shared/priority-badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { CreateTicketDialog } from "@/components/tickets/create-ticket-dialog"
import { formatRelativeTime } from "@/lib/utils"
import type { TicketWithRelations } from "@/types"

interface Props {
  tickets: TicketWithRelations[]
  projects: { id: string; name: string }[]
}

export function TicketsClient({ tickets, projects }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [projectFilter, setProjectFilter] = useState("ALL")
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = tickets.filter((t) => {
    const matchSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketKey.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter
    const matchType = typeFilter === "ALL" || t.type === typeFilter
    const matchProject = projectFilter === "ALL" || t.projectId === projectFilter
    return matchSearch && matchStatus && matchType && matchProject
  })

  return (
    <>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New ticket
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              className="pl-8 h-8 w-52 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In progress</SelectItem>
              <SelectItem value="IN_REVIEW">In review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="BUG">Bug</SelectItem>
              <SelectItem value="FEATURE">Feature</SelectItem>
              <SelectItem value="TASK">Task</SelectItem>
              <SelectItem value="IMPROVEMENT">Improvement</SelectItem>
              <SelectItem value="QUESTION">Question</SelectItem>
            </SelectContent>
          </Select>
          {(search || statusFilter !== "ALL" || typeFilter !== "ALL" || projectFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setSearch("")
                setStatusFilter("ALL")
                setTypeFilter("ALL")
                setProjectFilter("ALL")
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Ticket list */}
        <Card className="shadow-none">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground text-sm">No tickets found</p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                  <span className="w-20">ID</span>
                  <span className="flex-1">Title</span>
                  <span className="w-24 hidden sm:block">Project</span>
                  <span className="w-20 hidden md:block">Assignee</span>
                  <span className="w-20 hidden lg:block">Priority</span>
                  <span className="w-24">Status</span>
                </div>
                <div className="divide-y">
                  {filtered.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/tickets/${ticket.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="w-20 shrink-0 flex items-center gap-1.5">
                        <TicketTypeBadge type={ticket.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ticket.title}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {ticket.ticketKey} · {formatRelativeTime(ticket.updatedAt)}
                        </p>
                      </div>
                      <span className="w-24 text-xs text-muted-foreground hidden sm:block truncate">
                        {ticket.project.name}
                      </span>
                      <div className="w-20 hidden md:flex items-center">
                        {ticket.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <UserAvatar user={ticket.assignee} size="xs" />
                            <span className="text-xs truncate">{ticket.assignee.name?.split(" ")[0]}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="w-20 hidden lg:block">
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      <div className="w-24 shrink-0">
                        <StatusBadge status={ticket.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {tickets.length} tickets
        </p>
      </div>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
