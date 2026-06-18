import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const patchSchema = z.object({
  done: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

    const step = await prisma.workflowStep.update({
      where: { id: params.stepId, projectId: params.id },
      data: parsed.data,
    })
    return NextResponse.json(step)
  } catch (e) {
    console.error("[projects/[id]/workflow/[stepId] PATCH]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.workflowStep.delete({
      where: { id: params.stepId, projectId: params.id },
    })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error("[projects/[id]/workflow/[stepId] DELETE]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
