import { Badge } from "@/components/ui/badge"
import type { TicketStatus } from "@/types"

const labels: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
  CANCELLED: "Cancelled",
}

const variants: Record<TicketStatus, any> = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  DONE: "done",
  CANCELLED: "cancelled",
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
