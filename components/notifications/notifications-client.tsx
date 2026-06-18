"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn, formatRelativeTime } from "@/lib/utils"
import type { Notification, NotificationType } from "@/types"

const TYPE_ICONS: Record<NotificationType, string> = {
  TICKET_ASSIGNED: "📋",
  TICKET_COMMENT: "💬",
  TICKET_STATUS_CHANGED: "🔄",
  TICKET_MENTIONED: "🏷️",
  TICKET_DUE_SOON: "⏰",
  PROJECT_MILESTONE: "🎯",
  PROJECT_MEMBER_ADDED: "👋",
}

export function NotificationsClient({ notifications }: { notifications: Notification[] }) {
  const router = useRouter()
  const [items, setItems] = useState(notifications)

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" })
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      toast.success("All notifications marked as read")
    } catch {
      toast.error("Failed to mark as read")
    }
  }

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" })
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch {}
  }

  const unreadCount = items.filter((n) => !n.read).length

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <Card className="shadow-none">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-5 py-4 transition-colors",
                    !n.read ? "bg-primary/5" : "hover:bg-muted/30"
                  )}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  <span className="text-xl mt-0.5 shrink-0">
                    {TYPE_ICONS[n.type] ?? "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.read && (
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    {n.link && (
                      <Link
                        href={n.link}
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View →
                      </Link>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
