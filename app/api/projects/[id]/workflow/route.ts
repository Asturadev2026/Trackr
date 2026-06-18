import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({ name: z.string().min(1).max(200) })

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const steps = await prisma.workflowStep.findMany({
      where: { projectId: params.id },
      orderBy: { order: "asc" },
    })
    return NextResponse.json(steps)
  } catch (e) {
    console.error("[projects/[id]/workflow GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

    const last = await prisma.workflowStep.findFirst({
      where: { projectId: params.id },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    const step = await prisma.workflowStep.create({
      data: {
        projectId: params.id,
        name: parsed.data.name,
        order: (last?.order ?? -1) + 1,
      },
    })
    return NextResponse.json(step, { status: 201 })
  } catch (e) {
    console.error("[projects/[id]/workflow POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
