import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { NotificationsClient } from "@/components/notifications/notifications-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Notifications" }

export default async function NotificationsPage() {
  const session = await getSession()
  const userId = session!.user.id

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return <NotificationsClient notifications={notifications} />
}
