import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const schema = z.object({ progress: z.number().int().min(0).max(100) })

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { ownerId: true, members: { select: { userId: true, role: true } } },
  })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOwner = project.ownerId === session.user.id
  const isManager = project.members.some(
    (m) => m.userId === session.user.id && m.role === "PROJECT_MANAGER"
  )
  if (!isOwner && !isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: { progress: parsed.data.progress },
    select: { progress: true },
  })

  return NextResponse.json(updated)
}
