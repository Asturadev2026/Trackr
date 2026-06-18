import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { ProjectSettingsClient } from "@/components/projects/project-settings-client"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Project Settings" }

export default async function ProjectSettingsPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  const userId = session!.user.id

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, role: true } },
        },
      },
    },
  })

  if (!project) notFound()

  const isMember = project.members.some((m) => m.userId === userId)
  const isAdmin = ["ADMIN", "MANAGER", "AI_ENGINEER", "SENIOR_ENGINEER", "BUSINESS"].includes(session!.user.role)
  if (!isMember && !isAdmin) redirect("/projects")

  const serialized = {
    ...project,
    dueDate: project.dueDate ? project.dueDate.toISOString() : null,
    members: project.members.map((m) => ({
      ...m,
      user: { ...m.user, role: m.user.role as string },
    })),
  }

  return <ProjectSettingsClient project={serialized} />
}
