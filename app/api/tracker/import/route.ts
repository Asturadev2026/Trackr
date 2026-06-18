import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const taskSchema = z.object({
  description: z.string().min(1),
  hours: z.number().min(0).max(24).default(0),
  status: z.enum(["IN_PROGRESS", "DONE", "BLOCKED"]).default("IN_PROGRESS"),
  projectName: z.string().optional(),
  projectId: z.string().optional(),
  priority: z.string().optional(),
})

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tasks: z.array(taskSchema),
  notes: z.string().optional(),
  blockers: z.string().optional(),
  weekGoal: z.string().optional(),
  learnings: z.string().optional(),
  nextFocus: z.string().optional(),
  managerNotes: z.string().optional(),
})

const importSchema = z.object({
  entries: z.array(entrySchema).max(500),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = importSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const { entries } = parsed.data
    const userId = session.user.id

    // ── Deduplicate by date (multiple sheets can cover the same dates) ──────────
    const mergedMap = new Map<string, typeof entries[0]>()
    for (const entry of entries) {
      if (mergedMap.has(entry.date)) {
        const existing = mergedMap.get(entry.date)!
        existing.tasks = [...existing.tasks, ...entry.tasks]
        if (entry.notes)        existing.notes        = [existing.notes,        entry.notes].filter(Boolean).join("\n")
        if (entry.blockers)     existing.blockers     = [existing.blockers,     entry.blockers].filter(Boolean).join("\n")
        if (entry.weekGoal)     existing.weekGoal     = existing.weekGoal     || entry.weekGoal
        if (entry.learnings)    existing.learnings    = existing.learnings    || entry.learnings
        if (entry.nextFocus)    existing.nextFocus    = existing.nextFocus    || entry.nextFocus
        if (entry.managerNotes) existing.managerNotes = existing.managerNotes || entry.managerNotes
      } else {
        mergedMap.set(entry.date, { ...entry, tasks: [...entry.tasks] })
      }
    }
    const deduped = Array.from(mergedMap.values())

    // Pre-compute combined notes for every entry
    const prepared = deduped.map((e) => ({
      ...e,
      combinedNotes: [
        e.weekGoal     ? `Weekly Goal: ${e.weekGoal}`        : null,
        e.notes        ? e.notes                             : null,
        e.managerNotes ? `Manager Review: ${e.managerNotes}` : null,
        e.learnings    ? `Learnings: ${e.learnings}`         : null,
        e.nextFocus    ? `Focus Next Week: ${e.nextFocus}`   : null,
      ].filter(Boolean).join("\n\n") || null,
      dateObj: new Date(e.date + "T00:00:00.000Z"),
    }))

    // ── Query 1: find which entries already exist ───────────────────────────────
    const existing = await prisma.dailyEntry.findMany({
      where: { userId, date: { in: prepared.map((e) => e.dateObj) } },
      select: { id: true, date: true },
    })
    const idMap = new Map(existing.map((e) => [e.date.toISOString().split("T")[0], e.id]))

    const toCreate = prepared.filter((e) => !idMap.has(e.date))
    const toUpdate = prepared.filter((e) =>  idMap.has(e.date))

    // ── Query 2: create new entries (skipDuplicates guards against any races) ───
    if (toCreate.length > 0) {
      await prisma.dailyEntry.createMany({
        data: toCreate.map((e) => ({
          userId,
          date: e.dateObj,
          notes: e.combinedNotes ?? undefined,
          blockers: e.blockers ?? undefined,
        })),
        skipDuplicates: true,
      })

      // Fetch the IDs we just created
      const created = await prisma.dailyEntry.findMany({
        where: { userId, date: { in: toCreate.map((e) => e.dateObj) } },
        select: { id: true, date: true },
      })
      created.forEach((c) => idMap.set(c.date.toISOString().split("T")[0], c.id))
    }

    // ── Query 3: update existing entries ────────────────────────────────────────
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((e) =>
          prisma.dailyEntry.update({
            where: { id: idMap.get(e.date)! },
            data: { notes: e.combinedNotes ?? undefined, blockers: e.blockers ?? undefined },
          })
        )
      )
    }

    // ── Resolve project names → IDs ─────────────────────────────────────────────
    const userProjects = await prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true, name: true },
    })
    const projectNameToId = new Map(userProjects.map((p) => [p.name.toLowerCase().trim(), p.id]))

    // ── Query 4: delete all old tasks for every affected entry ──────────────────
    const allIds = prepared.map((e) => idMap.get(e.date)).filter((id): id is string => !!id)
    if (allIds.length > 0) {
      await prisma.dailyTask.deleteMany({ where: { entryId: { in: allIds } } })
    }

    // ── Query 5: insert ALL tasks in one createMany ─────────────────────────────
    const allTasks = prepared.flatMap((e) => {
      const entryId = idMap.get(e.date)
      if (!entryId) return []
      return e.tasks
        .filter((t) => t.description.trim())
        .map((t, i) => {
          const resolvedProjectId =
            t.projectId ||
            (t.projectName ? projectNameToId.get(t.projectName.toLowerCase().trim()) ?? null : null)
          const resolvedProjectName =
            resolvedProjectId
              ? (userProjects.find((p) => p.id === resolvedProjectId)?.name ?? t.projectName ?? null)
              : t.projectName || null
          return {
            entryId,
            description: t.description.trim(),
            projectId:   resolvedProjectId,
            projectName: resolvedProjectName,
            hours:       t.hours,
            status:      t.status,
            order:       i,
          }
        })
    })

    if (allTasks.length > 0) {
      await prisma.dailyTask.createMany({ data: allTasks })
    }

    return NextResponse.json({ imported: prepared.length, tasks: allTasks.length })
  } catch (e) {
    console.error("[tracker/import POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
