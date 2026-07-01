"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Copy, Check, RefreshCw, Trash2, Bot, Terminal, FileJson, Zap } from "lucide-react"
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
  hasApiKey: boolean
  appUrl: string
}

export function SettingsClient({ user, hasApiKey, appUrl }: Props) {
  const router = useRouter()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [hasKey, setHasKey] = useState(hasApiKey)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [generatingKey, setGeneratingKey] = useState(false)
  const [revokingKey, setRevokingKey] = useState(false)
  const [copied, setCopied] = useState(false)

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

  async function generateKey() {
    setGeneratingKey(true)
    try {
      const res = await fetch("/api/user/api-key", { method: "POST" })
      if (!res.ok) throw new Error()
      const { key } = await res.json()
      setGeneratedKey(key)
      setHasKey(true)
    } catch {
      toast.error("Failed to generate key")
    } finally {
      setGeneratingKey(false)
    }
  }

  async function revokeKey() {
    if (!confirm("Revoke your API key? Any connected Claude sessions will stop working immediately.")) return
    setRevokingKey(true)
    try {
      const res = await fetch("/api/user/api-key", { method: "DELETE" })
      if (!res.ok) throw new Error()
      setHasKey(false)
      setGeneratedKey(null)
      toast.success("API key revoked")
    } catch {
      toast.error("Failed to revoke key")
    } finally {
      setRevokingKey(false)
    }
  }

  async function copyKey(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadMcpJson() {
    if (!generatedKey && !hasKey) return
    const content = JSON.stringify({
      mcpServers: {
        trackr: {
          type: "http",
          url: `${appUrl}/api/mcp`,
          headers: { Authorization: `Bearer ${generatedKey ?? "YOUR_API_KEY_HERE"}` },
          alwaysAllow: ["list_projects", "list_users", "list_tickets", "create_ticket", "update_ticket", "add_comment"],
        },
      },
    }, null, 2)
    const blob = new Blob([content], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = ".mcp.json"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const mcpJson = JSON.stringify({
    mcpServers: {
      trackr: {
        type: "http",
        url: `${appUrl}/api/mcp`,
        headers: { Authorization: "Bearer YOUR_API_KEY_HERE" },
      },
    },
  }, null, 2)

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="claude">Claude Integration</TabsTrigger>
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
        {/* Claude Integration */}
        <TabsContent value="claude" className="mt-4 space-y-4">

          {/* API Key card */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4" /> API Key
              </CardTitle>
              <CardDescription>
                Your personal key lets Claude act as you in Trackr — create tickets, update tasks, add comments.
                The raw key is shown only once (we store only a hash, like GitHub tokens).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {generatedKey ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    ⚠ Copy this key now — it will not be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono break-all select-all">
                      {generatedKey}
                    </code>
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyKey(generatedKey)}>
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ) : hasKey ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  API key active (value hidden)
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No API key generated yet.</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant={hasKey ? "outline" : "default"} onClick={generateKey} disabled={generatingKey}>
                  {generatingKey
                    ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating…</>
                    : hasKey
                    ? <><RefreshCw className="mr-2 h-3.5 w-3.5" />Regenerate key</>
                    : <><Zap className="mr-2 h-3.5 w-3.5" />Generate API key</>}
                </Button>
                {hasKey && (
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={revokeKey} disabled={revokingKey}>
                    {revokingKey ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                    Revoke
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Setup instructions */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Connect to Claude Code
              </CardTitle>
              <CardDescription>
                Follow these steps once. No repo cloning or build steps needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Generate your API key above</p>
                  <p className="text-xs text-muted-foreground">Click &quot;Generate API key&quot; and copy the key shown. It&apos;s only visible once.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium">Download your config file</p>
                  <p className="text-xs text-muted-foreground">
                    Click below — it downloads a <code className="bg-muted px-1 rounded text-[11px]">.mcp.json</code> file with your key already filled in.
                    Save it anywhere on your computer (Desktop is fine).
                  </p>
                  <Button size="sm" variant="outline" onClick={downloadMcpJson} disabled={!generatedKey}>
                    <FileJson className="mr-2 h-3.5 w-3.5" />
                    Download .mcp.json
                  </Button>
                  {!generatedKey && (
                    <p className="text-xs text-muted-foreground">
                      {hasKey
                        ? "Click \"Regenerate key\" above first — the raw key is only available right after generation."
                        : "Generate your API key first (Step 1)."}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Open the folder in Claude Code</p>
                  <p className="text-xs text-muted-foreground">
                    Open the <strong>Claude Code desktop app</strong> → click <strong>New session</strong> → select the folder where you saved the downloaded file.
                    Claude Code picks up the config automatically — no terminal needed.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Start using it</p>
                  <p className="text-xs text-muted-foreground">Try these in Claude Code:</p>
                  <div className="space-y-1">
                    {[
                      "List my projects",
                      "Show all open URGENT tickets",
                      'Create a HIGH bug "login redirect loops" in [project name]',
                      "Move [ticket key] to In Progress and assign to me",
                      'Add a comment to [ticket key]: "fixed in latest deploy"',
                    ].map((ex) => (
                      <div key={ex} className="flex items-start gap-1.5">
                        <span className="text-muted-foreground text-xs mt-0.5">›</span>
                        <code className="text-xs text-muted-foreground italic">{ex}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <FileJson className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>
                  The <code className="bg-muted px-1 rounded">.mcp.json</code> file stays on your machine and is never uploaded anywhere.
                  Do not commit it to git — add it to your <code className="bg-muted px-1 rounded">.gitignore</code>.
                  Each team member generates their own key; actions happen under their own account.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
