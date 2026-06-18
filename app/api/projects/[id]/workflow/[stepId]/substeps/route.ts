import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({ name: z.string().min(1).max(300) })

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  const last = await prisma.workflowSubStep.findFirst({
    where: { stepId: params.stepId },
    orderBy: { order: "desc" },
    select: { order: true },
  })

  const sub = await prisma.workflowSubStep.create({
    data: {
      stepId: params.stepId,
      name: parsed.data.name,
      order: (last?.order ?? -1) + 1,
    },
  })
  return NextResponse.json(sub, { status: 201 })
}
