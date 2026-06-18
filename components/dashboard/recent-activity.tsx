import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials, formatRelativeTime } from "@/lib/utils"

interface ActivityItem {
  id: string
  action: string
  field?: string | null
  oldValue?: string | null
  newValue?: string | null
  createdAt: Date
  user: { id: string; name: string | null; image: string | null }
  ticket: { ticketKey: string; title: string }
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5">
              <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                <AvatarImage src={item.user.image ?? undefined} />
                <AvatarFallback className="text-[9px]">
                  {getInitials(item.user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-relaxed">
                  <span className="font-medium">{item.user.name}</span>{" "}
                  {item.action}{" "}
                  <span className="font-mono text-primary">{item.ticket.ticketKey}</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
