import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketTypeBadge } from "@/components/shared/ticket-type-badge"
import type { TicketWithRelations } from "@/types"

export function MyTicketsTable({ tickets }: { tickets: TicketWithRelations[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">My tickets</CardTitle>
          <Link
            href="/tickets?assignee=me"
            className="text-xs text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {tickets.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No open tickets assigned to you
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
              >
                <TicketTypeBadge type={ticket.type} />
                <span className="flex-1 text-sm font-medium truncate">{ticket.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground font-mono">
                  {ticket.ticketKey}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
