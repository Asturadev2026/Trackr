import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: Date | string, fmt = "MMM d, yyyy") {
  return format(new Date(date), fmt)
}

export function getInitials(name?: string | null) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function generateTicketKey(projectName: string, count: number) {
  const prefix = projectName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4)
  return `${prefix}-${count + 1}`
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export const PRIORITY_COLORS = {
  LOW: "text-green-600 bg-green-50 border-green-200",
  MEDIUM: "text-amber-600 bg-amber-50 border-amber-200",
  HIGH: "text-red-600 bg-red-50 border-red-200",
  URGENT: "text-purple-600 bg-purple-50 border-purple-200",
}

export const STATUS_COLORS = {
  OPEN: "text-slate-600 bg-slate-100 border-slate-200",
  IN_PROGRESS: "text-blue-600 bg-blue-50 border-blue-200",
  IN_REVIEW: "text-amber-600 bg-amber-50 border-amber-200",
  DONE: "text-green-600 bg-green-50 border-green-200",
  CANCELLED: "text-slate-400 bg-slate-50 border-slate-200",
}

export const TICKET_TYPE_COLORS = {
  BUG: "text-red-600 bg-red-50 border-red-200",
  FEATURE: "text-blue-600 bg-blue-50 border-blue-200",
  TASK: "text-amber-600 bg-amber-50 border-amber-200",
  IMPROVEMENT: "text-green-600 bg-green-50 border-green-200",
  QUESTION: "text-purple-600 bg-purple-50 border-purple-200",
}

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: "text-slate-600 bg-slate-100",
  ACTIVE: "text-green-700 bg-green-100",
  ON_HOLD: "text-slate-500 bg-slate-100",
  DONE: "text-green-700 bg-green-100",
  DELAYED: "text-red-600 bg-red-50",
  AT_RISK: "text-amber-600 bg-amber-50",
}

export const PROJECT_PROGRESS_COLOR: Record<string, string> = {
  PLANNING: "bg-blue-500",
  ACTIVE: "bg-green-500",
  ON_HOLD: "bg-red-500",
  DONE: "bg-green-500",
  DELAYED: "bg-red-500",
  AT_RISK: "bg-amber-500",
}
