import { Badge } from "@/components/ui/badge"
import type { TicketType } from "@/types"

const labels: Record<TicketType, string> = {
  BUG: "Bug",
  FEATURE: "Feature",
  TASK: "Task",
  IMPROVEMENT: "Improvement",
  QUESTION: "Question",
}

const variants: Record<TicketType, any> = {
  BUG: "bug",
  FEATURE: "feature",
  TASK: "task",
  IMPROVEMENT: "improvement",
  QUESTION: "question",
}

export function TicketTypeBadge({ type }: { type: TicketType }) {
  return <Badge variant={variants[type]}>{labels[type]}</Badge>
}
