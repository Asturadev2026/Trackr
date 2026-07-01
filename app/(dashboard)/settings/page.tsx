import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { SettingsClient } from "@/components/settings/settings-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const session = await getSession()
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, name: true, email: true, image: true, role: true, apiKey: true },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://trackr-two-sigma.vercel.app"

  return <SettingsClient user={user!} hasApiKey={!!user?.apiKey} appUrl={appUrl} />
}
