import { NextRequest, NextResponse } from "next/server"
import { authenticate } from "@/lib/api-auth"
import { prisma } from "@/lib/db"
import { sendMail, ticketAssignedEmail } from "@/lib/mail"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await authenticate(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, image: true, email: true } },
        reporter: { select: { id: true, name: true, image: true } },
        comments: {
          include: { author: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
        activityLogs: {
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
        watchers: { include: { user: { select: { id: true, name: true, image: true } } } },
      },
    })

    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(ticket)
  } catch (e) {
    console.error("[tickets/[id] GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await authenticate(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const existing = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { project: { select: { name: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updates: any = {}
    const logEntries: { field: string; oldValue: string; newValue: string; action: string }[] = []

    if (body.status !== undefined && body.status !== existing.status) {
      updates.status = body.status
      logEntries.push({
        field: "status",
        oldValue: existing.status,
        newValue: body.status,
        action: "changed status",
      })
      // Notify watchers
      const watchers = await prisma.ticketWatcher.findMany({ where: { ticketId: params.id } })
      for (const w of watchers) {
        if (w.userId !== session.user.id) {
          await prisma.notification.create({
            data: {
              userId: w.userId,
              type: "TICKET_STATUS_CHANGED",
              title: `${existing.ticketKey} status changed`,
              message: `${session.user.name} changed status from ${existing.status} to ${body.status}`,
              link: `/tickets/${params.id}`,
            },
          })
        }
      }
    }

    if (body.priority !== undefined && body.priority !== existing.priority) {
      updates.priority = body.priority
      logEntries.push({ field: "priority", oldValue: existing.priority, newValue: body.priority, action: "changed priority" })
    }

    if (body.assigneeId !== undefined && body.assigneeId !== existing.assigneeId) {
      updates.assigneeId = body.assigneeId || null
      logEntries.push({ field: "assignee", oldValue: existing.assigneeId ?? "unassigned", newValue: body.assigneeId ?? "unassigned", action: "changed assignee" })

      if (body.assigneeId && body.assigneeId !== session.user.id) {
        const assignee = await prisma.user.findUnique({
          where: { id: body.assigneeId },
          select: { id: true, name: true, email: true },
        })
        if (assignee) {
          await prisma.notification.create({
            data: {
              userId: assignee.id,
              type: "TICKET_ASSIGNED",
              title: `Assigned: ${existing.ticketKey}`,
              message: `${session.user.name} assigned you "${existing.title}"`,
              link: `/tickets/${params.id}`,
            },
          })
          if (assignee.email) {
            sendMail({
              to: assignee.email,
              subject: `[${existing.ticketKey}] You've been assigned: ${existing.title}`,
              html: ticketAssignedEmail({
                userName: assignee.name ?? "there",
                ticketKey: existing.ticketKey,
                ticketTitle: existing.title,
                projectName: existing.project.name,
                assignedBy: session.user.name ?? "Someone",
                ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${params.id}`,
              }),
            })
          }
        }
      }
    }

    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? new Date(body.dueDate) : null
    if (body.estimatedHours !== undefined) {
      const estimatedHours = Number(body.estimatedHours)
      updates.estimatedHours = Number.isFinite(estimatedHours) ? Math.max(0, Math.floor(estimatedHours)) : 0
    }
    if (body.labels !== undefined) updates.labels = body.labels

    const ticket = await prisma.ticket.update({ where: { id: params.id }, data: updates })

    // Log activities
    for (const log of logEntries) {
      await prisma.activityLog.create({
        data: { ticketId: params.id, userId: session.user.id, action: log.action, field: log.field, oldValue: log.oldValue, newValue: log.newValue },
      })
    }

    return NextResponse.json(ticket)
  } catch (e) {
    console.error("[tickets/[id] PATCH]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await authenticate(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.ticket.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[tickets/[id] DELETE]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
