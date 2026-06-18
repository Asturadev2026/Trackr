import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const patchSchema = z.object({
  role: z.enum(["ADMIN", "AI_ENGINEER", "INTERN", "SENIOR_ENGINEER", "MANAGER", "BUSINESS"]).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const canManage = ["ADMIN", "MANAGER", "AI_ENGINEER", "SENIOR_ENGINEER", "BUSINESS"].includes(session.user.role)
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Non-admins cannot promote someone to ADMIN
  if (session.user.role !== "ADMIN") {
    const body = await req.clone().json().catch(() => ({}))
    if (body.role === "ADMIN") return NextResponse.json({ error: "Only admins can assign the Admin role" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

    const user = await prisma.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })

    return NextResponse.json(user)
  } catch (e) {
    console.error("[users/[id] PATCH]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
