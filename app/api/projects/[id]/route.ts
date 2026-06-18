import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      members: { include: { user: { select: { id: true, name: true, image: true, role: true } } } },
      phases: { orderBy: { order: "asc" } },
      _count: { select: { tickets: true, members: true } },
    },
  })

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (project.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.project.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
