import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn, PROJECT_PROGRESS_COLOR } from "@/lib/utils"

interface ProjectHealthProps {
  projects: {
    id: string
    name: string
    status: string
    progress: number
    totalTickets: number
    doneTickets: number
  }[]
}

export function ProjectHealth({ projects }: ProjectHealthProps) {
  return (
    <Card className="shadow-none h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Active projects</CardTitle>
          <Link href="/projects" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No active projects
          </p>
        ) : (
          projects.map((p) => {
            // Use manually-set progress first; fall back to ticket-based %
            const pct =
              (p.progress ?? 0) > 0
                ? p.progress
                : p.totalTickets > 0
                ? Math.round((p.doneTickets / p.totalTickets) * 100)
                : 0
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors truncate max-w-[160px]">
                    {p.name}
                  </span>
                  <span className="text-sm text-muted-foreground shrink-0">{pct}%</span>
                </div>
                <Progress
                  value={pct}
                  className="h-2"
                  indicatorClassName={cn(PROJECT_PROGRESS_COLOR[p.status] ?? "bg-primary")}
                />
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
