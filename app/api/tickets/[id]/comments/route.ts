import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendMail, mentionEmail, ticketCommentEmail } from "@/lib/mail"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 })

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      reporter: { select: { id: true, name: true, email: true } },
      watchers: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  })
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const comment = await prisma.comment.create({
    data: { content, ticketId: params.id, authorId: session.user.id },
    include: { author: { select: { id: true, name: true, image: true } } },
  })

  // Log activity
  await prisma.activityLog.create({
    data: { ticketId: params.id, userId: session.user.id, action: "commented on this ticket" },
  })

  // Parse @mentions (format: @[name](userId))
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  const mentionedUserIds = new Set<string>()
  let match
  while ((match = mentionRegex.exec(content)) !== null) {
    mentionedUserIds.add(match[2])
  }

  for (const mentionedId of Array.from(mentionedUserIds)) {
    if (mentionedId === session.user.id) continue
    const mentionedUser = await prisma.user.findUnique({
      where: { id: mentionedId },
      select: { id: true, name: true, email: true },
    })
    if (!mentionedUser) continue

    await prisma.notification.create({
      data: {
        userId: mentionedId,
        type: "TICKET_MENTIONED",
        title: `Mentioned in ${ticket.ticketKey}`,
        message: `${session.user.name} mentioned you in a comment`,
        link: `/tickets/${params.id}`,
      },
    })

    if (mentionedUser.email) {
      sendMail({
        to: mentionedUser.email,
        subject: `${session.user.name} mentioned you in ${ticket.ticketKey}`,
        html: mentionEmail({
          userName: mentionedUser.name ?? "there",
          mentionedBy: session.user.name ?? "Someone",
          ticketKey: ticket.ticketKey,
          ticketTitle: ticket.title,
          context: content.replace(/@\[[^\]]+\]\([^)]+\)/g, (m: string) => m.split("]")[0].slice(2)),
          ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${params.id}`,
        }),
      })
    }
  }

  // Notify watchers (not mentioned, not author)
  const notifyIds = ticket.watchers
    .map((w) => w.user)
    .filter((u) => u.id !== session.user.id && !mentionedUserIds.has(u.id))

  for (const u of notifyIds) {
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: "TICKET_COMMENT",
        title: `New comment on ${ticket.ticketKey}`,
        message: `${session.user.name} commented on "${ticket.title}"`,
        link: `/tickets/${params.id}`,
      },
    })

    if (u.email) {
      sendMail({
        to: u.email,
        subject: `New comment on ${ticket.ticketKey}`,
        html: ticketCommentEmail({
          userName: u.name ?? "there",
          commenterName: session.user.name ?? "Someone",
          ticketKey: ticket.ticketKey,
          ticketTitle: ticket.title,
          comment: content,
          ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${params.id}`,
        }),
      })
    }
  }

  return NextResponse.json(comment, { status: 201 })
}
