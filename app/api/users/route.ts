import { NextRequest, NextResponse } from "next/server"
import { authenticate } from "@/lib/api-auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import bcrypt from "bcryptjs"

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "AI_ENGINEER", "INTERN", "SENIOR_ENGINEER", "MANAGER", "BUSINESS"]).default("AI_ENGINEER"),
  password: z.string().min(8),
})

export async function GET(req: NextRequest) {
  const session = await authenticate(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, image: true, role: true },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ data: users })
  } catch (e) {
    console.error("[users GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await authenticate(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const canManage = ["ADMIN", "MANAGER", "AI_ENGINEER", "SENIOR_ENGINEER", "BUSINESS"].includes(session.user.role)
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

    const { name, email, role, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, role, password: hashed },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (e) {
    console.error("[users POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
