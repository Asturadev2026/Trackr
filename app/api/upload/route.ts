import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const ticketId = formData.get("ticketId") as string | null
    const projectId = formData.get("projectId") as string | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })

    const ext = file.name.split(".").pop()
    const filename = `${randomUUID()}.${ext}`
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    const url = `/uploads/${filename}`

    const attachment = await prisma.attachment.create({
      data: {
        ticketId: ticketId || null,
        projectId: projectId || null,
        uploadedById: session.user.id,
        name: file.name,
        url,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (err) {
    console.error("Upload error:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
