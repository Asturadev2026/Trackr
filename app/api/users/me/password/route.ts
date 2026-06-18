import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { currentPassword, newPassword } = await req.json()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user?.password) return NextResponse.json({ error: "No password set" }, { status: 400 })

    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[users/me/password PATCH]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
