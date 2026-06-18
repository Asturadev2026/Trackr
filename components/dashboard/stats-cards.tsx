import { Card, CardContent } from "@/components/ui/card"
import { Users, Ticket, FolderKanban, Clock } from "lucide-react"

interface Stats {
  totalUsers: number
  totalTickets: number
  totalProjects: number
  hoursThisWeek: number
}

export function DashboardStats({ stats }: { stats: Stats }) {
  const cards = [
    {
      label: "Users",
      value: stats.totalUsers,
      icon: Users,
      valueClass: "text-foreground",
    },
    {
      label: "Tickets",
      value: stats.totalTickets,
      icon: Ticket,
      valueClass: "text-foreground",
    },
    {
      label: "Projects",
      value: stats.totalProjects,
      icon: FolderKanban,
      valueClass: "text-foreground",
    },
    {
      label: "Hrs this wk",
      value: stats.hoursThisWeek,
      icon: Clock,
      valueClass: "text-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.valueClass}`}>{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
