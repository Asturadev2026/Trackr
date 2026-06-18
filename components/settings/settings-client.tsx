"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(8, "Must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

interface Props {
  user: { id: string; name: string | null; email: string; image: string | null; role: string }
}

export function SettingsClient({ user }: Props) {
  const router = useRouter()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const profileForm = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name ?? "" } })
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) })

  const saveProfile = async (data: { name: string }) => {
    setSavingProfile(true)
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast.success("Profile updated!")
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (data: any) => {
    setSavingPassword(true)
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success("Password updated!")
      passwordForm.reset()
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update password")
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Profile information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatar user={user} size="lg" />
                <div>
                  <p className="font-medium">{user.name}</p>
                  <Badge variant="outline" className="text-xs mt-0.5">
                    {user.role.charAt(0) + user.role.slice(1).toLowerCase().replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <Separator />
              <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input {...profileForm.register("name")} />
                  {profileForm.formState.errors.name && (
                    <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed. Contact admin.</p>
                </div>
                <Button type="submit" size="sm" disabled={savingProfile}>
                  {savingProfile && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Save changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Notification preferences</CardTitle>
              <CardDescription>Choose what you get notified about via email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Ticket assigned to me", description: "When someone assigns a ticket to you" },
                { label: "Someone @mentions me", description: "When you're mentioned in a comment" },
                { label: "Ticket status changes", description: "For tickets you're watching" },
                { label: "Ticket due soon", description: "24 hours before a ticket is due" },
                { label: "Project milestone reached", description: "When a project phase is completed" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Change password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(savePassword)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Current password</Label>
                  <Input type="password" {...passwordForm.register("currentPassword")} />
                  {!!passwordForm.formState.errors.currentPassword?.message && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message as string}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>New password</Label>
                  <Input type="password" {...passwordForm.register("newPassword")} />
                  {!!passwordForm.formState.errors.newPassword?.message && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message as string}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm new password</Label>
                  <Input type="password" {...passwordForm.register("confirmPassword")} />
                  {!!passwordForm.formState.errors.confirmPassword?.message && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message as string}</p>
                  )}
                </div>
                <Button type="submit" size="sm" disabled={savingPassword}>
                  {savingPassword && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Update password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
