import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        // Ticket types
        bug: "border-red-200 bg-red-50 text-red-600",
        feature: "border-blue-200 bg-blue-50 text-blue-600",
        task: "border-amber-200 bg-amber-50 text-amber-700",
        improvement: "border-green-200 bg-green-50 text-green-700",
        question: "border-purple-200 bg-purple-50 text-purple-600",
        // Priorities
        low: "border-green-200 bg-green-50 text-green-700",
        medium: "border-amber-200 bg-amber-50 text-amber-700",
        high: "border-red-200 bg-red-50 text-red-600",
        urgent: "border-purple-200 bg-purple-50 text-purple-600",
        // Statuses
        open: "border-slate-200 bg-slate-100 text-slate-600",
        in_progress: "border-blue-200 bg-blue-50 text-blue-600",
        in_review: "border-amber-200 bg-amber-50 text-amber-700",
        done: "border-green-200 bg-green-50 text-green-700",
        cancelled: "border-slate-200 bg-slate-50 text-slate-400",
        // Project statuses
        active: "border-green-200 bg-green-50 text-green-700",
        on_hold: "border-slate-200 bg-slate-100 text-slate-500",
        delayed: "border-red-200 bg-red-50 text-red-600",
        at_risk: "border-amber-200 bg-amber-50 text-amber-700",
        planning: "border-slate-200 bg-slate-100 text-slate-600",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
