"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  Ticket,
  CalendarDays,
  BarChart3,
  Users,
  Settings,
  Zap,
  Timer,
  UsersRound,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { hasMyTracker, hasTeamTracker } from "@/lib/roles"

const allNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { label: "Projects", href: "/projects", icon: FolderKanban, key: "projects" },
  { label: "Tickets", href: "/tickets", icon: Ticket, key: "tickets" },
  { label: "My Tracker", href: "/my-tracker", icon: CalendarDays, key: "my-tracker" },
  { label: "Team Tracker", href: "/team-tracker", icon: UsersRound, key: "team-tracker" },
  { label: "Sprints", href: "/sprints", icon: Timer, key: "sprints" },
  { label: "Reports", href: "/reports", icon: BarChart3, key: "reports" },
  { label: "Team", href: "/team", icon: Users, key: "team" },
]

const bottomItems = [
  { label: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ""

  const navItems = allNavItems.filter((item) => {
    if (item.key === "my-tracker") return hasMyTracker(role)
    if (item.key === "team-tracker") return hasTeamTracker(role)
    return true
  })

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex h-full w-56 flex-col border-r bg-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight">Trackr</span>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Bottom */}
        <div className="border-t py-3 px-2">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </aside>
    </TooltipProvider>
  )
}
