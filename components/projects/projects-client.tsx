"use client"

import { useState } from "react"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProjectCard } from "@/components/projects/project-card"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import type { ProjectWithCounts } from "@/types"

const STATUS_FILTERS = ["All", "Active", "At risk", "Delayed", "On hold", "Done"]

interface Props {
  projects: (ProjectWithCounts & { totalTickets: number; doneTickets: number })[]
}

export function ProjectsClient({ projects }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = projects.filter((p) => {
    const matchSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      statusFilter === "All" ||
      p.status.toLowerCase().replace("_", " ") === statusFilter.toLowerCase()
    return matchSearch && matchStatus
  })

  return (
    <>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-8 h-8 w-52 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border bg-card py-16 text-center">
            <p className="text-muted-foreground">
              {search || statusFilter !== "All"
                ? "No projects match your filters"
                : "No projects yet — create your first one"}
            </p>
            {!search && statusFilter === "All" && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
