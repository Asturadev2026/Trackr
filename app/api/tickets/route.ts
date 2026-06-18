import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { generateTicketKey } from "@/lib/utils"
import { sendMail, ticketAssignedEmail } from "@/lib/mail"

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["BUG", "FEATURE", "TASK", "IMPROVEMENT", "QUESTION"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  projectId: z.string().min(1),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  labels: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const sp = req.nextUrl.searchParams
    const page = parseInt(sp.get("page") ?? "1")
    const pageSize = Math.min(parseInt(sp.get("pageSize") ?? "20"), 100)

    const where: any = {}
    if (sp.get("projectId")) where.projectId = sp.get("projectId")
    if (sp.get("status")) where.status = sp.get("status")
    if (sp.get("type")) where.type = sp.get("type")
    if (sp.get("assigneeId")) where.assigneeId = sp.get("assigneeId")
    if (sp.get("priority")) where.priority = sp.get("priority")
    if (sp.get("q")) {
      where.OR = [
        { title: { contains: sp.get("q"), mode: "insensitive" } },
        { ticketKey: { contains: sp.get("q"), mode: "insensitive" } },
      ]
    }

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, image: true } },
          reporter: { select: { id: true, name: true, image: true } },
          _count: { select: { comments: true, attachments: true, watchers: true } },
        },
        orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ticket.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (e) {
    console.error("[tickets GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid data", details: parsed.error }, { status: 400 })

    const { title, description, type, priority, projectId, assigneeId, dueDate, labels } = parsed.data

    // Generate ticket key
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, _count: { select: { tickets: true } } },
    })
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const ticketKey = generateTicketKey(project.name, project._count.tickets)

    const ticket = await prisma.ticket.create({
      data: {
        ticketKey,
        title,
        description,
        type,
        priority,
        projectId,
        assigneeId: assigneeId || null,
        reporterId: session.user.id,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        labels: labels ?? [],
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true } },
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        ticketId: ticket.id,
        userId: session.user.id,
        action: "created this ticket",
      },
    })

    // Notify assignee
    if (ticket.assignee && ticket.assignee.id !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: ticket.assignee.id,
          type: "TICKET_ASSIGNED",
          title: `Assigned: ${ticketKey}`,
          message: `${session.user.name} assigned you "${title}"`,
          link: `/tickets/${ticket.id}`,
        },
      })

      if (ticket.assignee.email) {
        sendMail({
          to: ticket.assignee.email,
          subject: `[${ticketKey}] You've been assigned: ${title}`,
          html: ticketAssignedEmail({
            userName: ticket.assignee.name ?? "there",
            ticketKey,
            ticketTitle: title,
            projectName: project.name,
            assignedBy: session.user.name ?? "Someone",
            ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tickets/${ticket.id}`,
          }),
        })
      }
    }

    return NextResponse.json(ticket, { status: 201 })
  } catch (e) {
    console.error("[tickets POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
