import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { name } = await req.json()

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
      select: { id: true, name: true, email: true, image: true, role: true },
    })

    return NextResponse.json(user)
  } catch (e) {
    console.error("[users/me PATCH]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
