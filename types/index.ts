import type {
  User,
  Project,
  ProjectMember,
  Ticket,
  Comment,
  Attachment,
  DailyEntry,
  DailyTask,
  Notification,
  Sprint,
  Phase,
  ActivityLog,
  UserRole,
  ProjectStatus,
  TicketType,
  TicketStatus,
  Priority,
  SprintStatus,
  PhaseStatus,
  NotificationType,
  TaskStatus,
} from "@prisma/client"

export type {
  UserRole,
  ProjectStatus,
  TicketType,
  TicketStatus,
  Priority,
  SprintStatus,
  PhaseStatus,
  NotificationType,
  TaskStatus,
  Notification,
  Sprint,
}

export type SafeUser = Omit<User, "password"> & {
  role: UserRole
}

export type ProjectWithCounts = Project & {
  _count: { tickets: number; members: number }
  members: (ProjectMember & { user: Pick<User, "id" | "name" | "image"> })[]
  owner: Pick<User, "id" | "name" | "image">
  openTicketCount?: number
  doneTicketCount?: number
}

export type TicketWithRelations = Ticket & {
  project: Pick<Project, "id" | "name">
  assignee: Pick<User, "id" | "name" | "image"> | null
  reporter: Pick<User, "id" | "name" | "image">
  _count: { comments: number; attachments: number; watchers: number }
}

export type TicketDetail = Ticket & {
  estimatedHours?: number | null
  project: Pick<Project, "id" | "name">
  assignee: Pick<User, "id" | "name" | "image" | "email"> | null
  reporter: Pick<User, "id" | "name" | "image" | "email">
  comments: (Comment & { author: Pick<User, "id" | "name" | "image"> })[]
  attachments: Attachment[]
  activityLogs: (ActivityLog & {
    user: Pick<User, "id" | "name" | "image">
  })[]
  watchers: { userId: string; user: Pick<User, "id" | "name" | "image"> }[]
}

export type DailyEntryWithTasks = DailyEntry & {
  tasks: DailyTask[]
}

export type NotificationWithUser = Notification

export type SprintWithItems = Sprint & {
  items: { ticket: TicketWithRelations }[]
  _count: { items: number }
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Next Auth extension
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
    }
  }
}
