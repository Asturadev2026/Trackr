import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { readFile } from "fs/promises"
import { join } from "path"
import * as XLSX from "xlsx"

const MIME_MAP: Record<string, string> = {
  pdf:  "application/pdf",
  png:  "image/png",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  gif:  "image/gif",
  webp: "image/webp",
  svg:  "image/svg+xml",
  txt:  "text/plain",
  csv:  "text/csv",
  doc:  "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls:  "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt:  "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: params.id } })
    if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Safely extract just the filename from any stored URL format
    const filename = attachment.url.split("/").pop()!
    const filepath = join(process.cwd(), "public", "uploads", filename)
    const ext = filename.split(".").pop()?.toLowerCase() ?? ""

    // ── Excel / CSV → render as styled HTML table ─────────────────────────
    if (["xlsx", "xls", "csv"].includes(ext)) {
      const buf = await readFile(filepath)
      const wb = XLSX.read(buf, { type: "buffer" })
      const sheetNames = wb.SheetNames

      const sheetsHtml = sheetNames.map((name) => {
        const ws = wb.Sheets[name]
        const table = XLSX.utils.sheet_to_html(ws, { editable: false })
        return `<div class="sheet">
          ${sheetNames.length > 1 ? `<h3 class="sheet-name">${name}</h3>` : ""}
          <div class="table-wrap">${table}</div>
        </div>`
      }).join("")

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${attachment.name}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #1e293b; }
    .header { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid #e2e8f0; padding: 12px 24px; display: flex; align-items: center; gap: 12px; }
    .file-icon { width: 32px; height: 32px; border-radius: 8px; background: #dcfce7; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .file-name { font-weight: 600; font-size: 15px; }
    .file-meta { font-size: 12px; color: #64748b; margin-top: 1px; }
    .content { padding: 24px; max-width: 100%; overflow-x: auto; }
    .sheet { margin-bottom: 32px; }
    .sheet-name { font-size: 14px; font-weight: 600; color: #475569; margin: 0 0 8px; padding: 6px 12px; background: #e2e8f0; border-radius: 6px; display: inline-block; }
    .table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    td, th { border: 1px solid #e2e8f0; padding: 6px 12px; white-space: nowrap; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
    tr:first-child td, tr:first-child th { background: #f1f5f9; font-weight: 600; position: sticky; top: 0; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:hover td { background: #eff6ff; }
  </style>
</head>
<body>
  <div class="header">
    <div class="file-icon">📊</div>
    <div>
      <div class="file-name">${attachment.name}</div>
      <div class="file-meta">${sheetNames.length} sheet${sheetNames.length !== 1 ? "s" : ""}</div>
    </div>
  </div>
  <div class="content">${sheetsHtml}</div>
</body>
</html>`

      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }

    // ── PDF, images, plain text → serve inline ────────────────────────────
    const mimeType = MIME_MAP[ext] ?? attachment.mimeType ?? "application/octet-stream"
    const canInline = ["application/pdf", "text/plain", "text/csv", "image/", "image/svg"].some(
      (t) => mimeType.startsWith(t)
    )

    if (canInline) {
      const buf = await readFile(filepath)
      return new NextResponse(buf, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${attachment.name}"`,
        },
      })
    }

    // ── Word / PowerPoint / other → redirect to Google Docs Viewer ────────
    const publicUrl = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${attachment.url}`
    )
    return NextResponse.redirect(
      `https://docs.google.com/viewer?url=${publicUrl}&embedded=false`
    )
  } catch (e) {
    console.error("[preview GET]", e)
    return NextResponse.json({ error: "Preview failed" }, { status: 500 })
  }
}
