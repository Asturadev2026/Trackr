import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Deletes any tracker entries that fall on Saturday (6) or Sunday (0).
// These are ghost rows created by the timezone-shifted import bug.
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const userId = session.user.id

    // Fetch all entry dates for this user
    const entries = await prisma.dailyEntry.findMany({
      where: { userId },
      select: { id: true, date: true },
    })

    // Find weekend entries
    const weekendIds = entries
      .filter((e) => {
        const day = new Date(e.date).getUTCDay() // 0=Sun, 6=Sat
        return day === 0 || day === 6
      })
      .map((e) => e.id)

    if (weekendIds.length === 0) {
      return NextResponse.json({ deleted: 0, message: "No weekend entries found" })
    }

    // Delete tasks first (FK constraint), then entries
    await prisma.dailyTask.deleteMany({ where: { entryId: { in: weekendIds } } })
    await prisma.dailyEntry.deleteMany({ where: { id: { in: weekendIds } } })

    return NextResponse.json({ deleted: weekendIds.length })
  } catch (e) {
    console.error("[cleanup-weekends DELETE]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
