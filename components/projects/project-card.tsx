import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/shared/user-avatar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { formatDate, cn, PROJECT_STATUS_COLORS, PROJECT_PROGRESS_COLOR } from "@/lib/utils"
import type { ProjectWithCounts } from "@/types"

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  DONE: "Done",
  DELAYED: "Delayed",
  AT_RISK: "At risk",
}

interface Props {
  project: ProjectWithCounts & { totalTickets: number; doneTickets: number; progress?: number }
}

export function ProjectCard({ project }: Props) {
  // Use manually-set progress if available, otherwise compute from tickets
  const pct =
    (project.progress ?? 0) > 0
      ? project.progress!
      : project.totalTickets > 0
      ? Math.round((project.doneTickets / project.totalTickets) * 100)
      : 0

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="shadow-none hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {project.description}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0 text-xs", PROJECT_STATUS_COLORS[project.status])}
            >
              {STATUS_LABELS[project.status] ?? project.status}
            </Badge>
          </div>

          {/* Progress */}
          <div className="mt-3 mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{pct}% complete</span>
            <span>
              {project.doneTickets} / {project.totalTickets}
            </span>
          </div>
          <Progress
            value={pct}
            className="h-2"
            indicatorClassName={cn(PROJECT_PROGRESS_COLOR[project.status] ?? "bg-primary")}
          />

          {/* Footer row */}
          <div className="mt-3 flex items-center justify-between">
            <TooltipProvider delayDuration={0}>
              <div className="flex -space-x-1.5">
                {project.members.slice(0, 4).map((m) => (
                  <UserAvatar
                    key={m.userId}
                    user={m.user}
                    size="xs"
                    showTooltip
                    className="ring-2 ring-background"
                  />
                ))}
                {project.members.length > 4 && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted ring-2 ring-background text-[9px] font-medium text-muted-foreground">
                    +{project.members.length - 4}
                  </div>
                )}
              </div>
            </TooltipProvider>
            <span className="text-xs text-muted-foreground">
              {project.dueDate ? `Due ${formatDate(project.dueDate, "MMM d")}` : "No due date"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
