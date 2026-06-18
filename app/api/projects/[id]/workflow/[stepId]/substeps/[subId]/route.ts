import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const patchSchema = z.object({
  done: z.boolean().optional(),
  name: z.string().min(1).max(300).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; stepId: string; subId: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

    const sub = await prisma.workflowSubStep.update({
      where: { id: params.subId, stepId: params.stepId },
      data: parsed.data,
    })
    return NextResponse.json(sub)
  } catch (e) {
    console.error("[projects/[id]/workflow/[stepId]/substeps/[subId] PATCH]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; stepId: string; subId: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.workflowSubStep.delete({
      where: { id: params.subId, stepId: params.stepId },
    })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error("[projects/[id]/workflow/[stepId]/substeps/[subId] DELETE]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
