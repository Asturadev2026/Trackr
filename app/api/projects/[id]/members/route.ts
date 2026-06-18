import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const members = await prisma.projectMember.findMany({
    where: { projectId: params.id },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
  })

  return NextResponse.json(members.map((m) => ({ ...m.user, memberRole: m.role })))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { role } = body
  let userId = body.userId as string | undefined

  // Support adding by email
  if (!userId && body.email) {
    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) return NextResponse.json({ error: "User not found with that email" }, { status: 404 })
    userId = user.id
  }

  if (!userId) return NextResponse.json({ error: "userId or email required" }, { status: 400 })

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: params.id, userId } },
    update: { role: role ?? "DEVELOPER" },
    create: { projectId: params.id, userId, role: role ?? "DEVELOPER" },
  })

  // Return updated member list for settings UI
  const members = await prisma.projectMember.findMany({
    where: { projectId: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, role: true } },
    },
  })

  return NextResponse.json({ members }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  await prisma.projectMember.deleteMany({
    where: { projectId: params.id, userId },
  })

  return NextResponse.json({ ok: true })
}
