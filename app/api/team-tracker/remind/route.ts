import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendMail } from "@/lib/mail"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { userIds, date } = await req.json() as { userIds: string[]; date: string }
    if (!userIds?.length) return NextResponse.json({ error: "userIds required" }, { status: 400 })

    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, name: true, email: true },
    })

    const senderName = session.user.name ?? "Your manager"
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
    const displayDate = new Date(date + "T00:00:00.000Z").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
    })

    await Promise.all(
      users.map((u) =>
        sendMail({
          to: u.email!,
          subject: `Reminder: Please log your work for ${displayDate}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <h2 style="color:#1e293b">Daily tracker reminder</h2>
              <p>Hi ${u.name ?? "there"},</p>
              <p><strong>${senderName}</strong> noticed you haven't logged your work for <strong>${displayDate}</strong> yet.</p>
              <p>It only takes a minute — log what you worked on today so the team stays in sync.</p>
              <a href="${appUrl}/my-tracker?date=${date}"
                 style="display:inline-block;background:#7ba4d4;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500;margin-top:8px">
                Log my work →
              </a>
              <p style="margin-top:24px;font-size:12px;color:#94a3b8">Trackr — Project Management</p>
            </div>
          `,
        })
      )
    )

    return NextResponse.json({ sent: users.length })
  } catch (e) {
    console.error("[team-tracker remind POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
