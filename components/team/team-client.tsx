"use client"

import { useState } from "react"
import { Search, UserPlus, MoreHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InviteUserDialog } from "@/components/team/invite-user-dialog"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  PROJECT_MANAGER: "Project Manager",
  DEVELOPER: "Developer",
  DESIGNER: "Designer",
  VIEWER: "Viewer",
}

const ROLE_BADGE_VARIANTS: Record<string, string> = {
  ADMIN: "text-purple-600 bg-purple-50 border-purple-200",
  PROJECT_MANAGER: "text-blue-600 bg-blue-50 border-blue-200",
  DEVELOPER: "text-green-600 bg-green-50 border-green-200",
  DESIGNER: "text-pink-600 bg-pink-50 border-pink-200",
  VIEWER: "text-slate-600 bg-slate-100 border-slate-200",
}

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  createdAt: Date
  _count: { assignedTickets: number; projectMembers: number }
}

interface Props {
  users: User[]
  currentUserId: string
  isAdmin: boolean
}

export function TeamClient({ users, currentUserId, isAdmin }: Props) {
  const [search, setSearch] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)

  const filtered = users.filter(
    (u) =>
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          {isAdmin && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Invite member
            </Button>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card className="shadow-none">
          <CardContent className="p-0">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-5 py-2.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
              <span className="w-8"></span>
              <span>Member</span>
              <span className="hidden sm:block w-28">Role</span>
              <span className="hidden md:block w-24 text-center">Tickets</span>
              <span className="w-8"></span>
            </div>
            <div className="divide-y">
              {filtered.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-5 py-3"
                >
                  <UserAvatar user={user} size="sm" className="w-8 h-8" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      {user.id === currentUserId && (
                        <Badge variant="secondary" className="text-xs py-0">You</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="hidden sm:block w-28">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        ROLE_BADGE_VARIANTS[user.role] ?? ""
                      }`}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </div>
                  <div className="hidden md:block w-24 text-center">
                    <span className="text-sm font-medium">{user._count.assignedTickets}</span>
                    <span className="text-xs text-muted-foreground"> tickets</span>
                  </div>
                  {isAdmin && user.id !== currentUserId ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Change role</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="w-7" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">{filtered.length} members</p>
      </div>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  )
}
