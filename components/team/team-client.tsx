"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { InviteUserDialog } from "@/components/team/invite-user-dialog"

export const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "SENIOR_ENGINEER", label: "Senior Engineer" },
  { value: "AI_ENGINEER", label: "AI Engineer" },
  { value: "BUSINESS", label: "Business" },
  { value: "INTERN", label: "Intern" },
] as const

const ROLE_LABELS: Record<string, string> = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]))

const ROLE_BADGE_VARIANTS: Record<string, string> = {
  ADMIN: "text-purple-600 bg-purple-50 border-purple-200",
  MANAGER: "text-amber-600 bg-amber-50 border-amber-200",
  SENIOR_ENGINEER: "text-green-600 bg-green-50 border-green-200",
  AI_ENGINEER: "text-blue-600 bg-blue-50 border-blue-200",
  BUSINESS: "text-orange-600 bg-orange-50 border-orange-200",
  INTERN: "text-slate-600 bg-slate-100 border-slate-200",
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

export function TeamClient({ users: initialUsers, currentUserId, isAdmin }: Props) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState("")
  const [saving, setSaving] = useState(false)

  const filtered = users.filter(
    (u) =>
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  function openChangeRole(user: User) {
    setRoleTarget(user)
    setSelectedRole(user.role)
  }

  async function handleRoleChange() {
    if (!roleTarget || !selectedRole) return
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${roleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed")
      }
      setUsers((prev) => prev.map((u) => u.id === roleTarget.id ? { ...u, role: selectedRole } : u))
      toast.success(`${roleTarget.name}'s role updated to ${ROLE_LABELS[selectedRole]}`)
      setRoleTarget(null)
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update role")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(user: User) {
    if (!confirm(`Deactivate ${user.name ?? user.email}? They will lose access.`)) return
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      })
      if (!res.ok) throw new Error()
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      toast.success(`${user.name} deactivated`)
    } catch {
      toast.error("Failed to deactivate user")
    }
  }

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
              <span className="hidden sm:block w-32">Role</span>
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
                  <div className="hidden sm:block w-32">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        ROLE_BADGE_VARIANTS[user.role] ?? "text-muted-foreground bg-muted border-border"
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
                        <DropdownMenuItem onClick={() => openChangeRole(user)}>
                          Change role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeactivate(user)}
                        >
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

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) router.refresh()
        }}
      />

      {/* Change Role Dialog */}
      <Dialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Updating role for <span className="font-medium text-foreground">{roleTarget?.name}</span>
            </p>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>Cancel</Button>
            <Button onClick={handleRoleChange} disabled={saving || selectedRole === roleTarget?.role}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
