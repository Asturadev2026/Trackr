import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { DocumentsClient } from "@/components/documents/documents-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Documents" }

export default async function DocumentsPage() {
  await getSession()

  const [attachments, projects] = await Promise.all([
    prisma.attachment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        ticket: { select: { ticketKey: true, project: { select: { id: true, name: true } } } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.project.findMany({
      where: { status: { in: ["PLANNING", "ACTIVE", "AT_RISK", "DELAYED"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const docs = attachments.map((a) => ({
    id: a.id,
    name: a.name,
    url: a.url,
    size: a.size,
    mimeType: a.mimeType,
    createdAt: a.createdAt.toISOString(),
    ticketId: a.ticketId,
    ticketKey: a.ticket?.ticketKey ?? null,
    projectId: a.ticket?.project?.id ?? a.projectId ?? null,
    projectName: a.ticket?.project?.name ?? a.project?.name ?? null,
  }))

  return <DocumentsClient docs={docs} projects={projects} />
}
