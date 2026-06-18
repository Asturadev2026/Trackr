import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const attachments = await prisma.attachment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        ticket: { select: { ticketKey: true, project: { select: { id: true, name: true } } } },
        project: { select: { id: true, name: true } },
      },
    })

    const docs = attachments.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      size: a.size,
      mimeType: a.mimeType,
      createdAt: a.createdAt.toISOString(),
      ticketId: a.ticketId,
      ticketKey: a.ticket?.ticketKey ?? null,
      projectId: a.ticket?.project?.id ?? a.projectId,
      projectName: a.ticket?.project?.name ?? a.project?.name ?? null,
    }))

    return NextResponse.json(docs)
  } catch (e) {
    console.error("[documents GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    await prisma.attachment.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[documents DELETE]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
