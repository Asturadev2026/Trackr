"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Ticket {
  id: string
  ticketKey: string
  title: string
  status: string
  priority: string
  type: string
  project: { id: string; name: string }
  assignee: { id: string; name: string | null; image: string | null } | null
}

interface Project {
  id: string
  name: string
  status: string
}

interface Props {
  query: string
  tickets: Ticket[]
  projects: Project[]
}

export function SearchClient({ query: initialQuery, tickets, projects }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery)
  const [isPending, startTransition] = useTransition()

  const handleSearch = (val: string) => {
    setQ(val)
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(val)}`)
    })
  }

  const total = tickets.length + projects.length

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Search</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search tickets, projects..."
          className="pl-9 h-10"
        />
      </div>

      {q.trim() && (
        <p className="text-sm text-muted-foreground">
          {isPending ? "Searching..." : `${total} result${total !== 1 ? "s" : ""} for "${q}"`}
        </p>
      )}

      {tickets.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tickets</h2>
          <div className="divide-y divide-border rounded-lg border bg-card">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{t.ticketKey}</span>
                  <span className="text-sm truncate">{t.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Badge variant="outline" className="text-[10px]">{t.status.replace("_", " ")}</Badge>
                  <span className="text-xs text-muted-foreground hidden sm:block">{t.project.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projects</h2>
          <div className="divide-y divide-border rounded-lg border bg-card">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="text-sm font-medium">{p.name}</span>
                <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {q.trim() && total === 0 && !isPending && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No results found for "{q}"</p>
        </div>
      )}

      {!q.trim() && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Type to search across tickets and projects</p>
        </div>
      )}
    </div>
  )
}
