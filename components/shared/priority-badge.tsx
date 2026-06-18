import { Badge } from "@/components/ui/badge"
import type { Priority } from "@/types"

const labels: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

const variants: Record<Priority, any> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge variant={variants[priority]}>{labels[priority]}</Badge>
}
