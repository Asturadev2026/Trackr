import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

// Everything (including dates/times) is stored as the EXACT text from the cell,
// so the export reproduces any user's format identically.
const text = z.string().nullable()

const weeklyRow = z.object({
  weekStart: text, weekEnd: text, employeeName: text, role: text, manager: text,
  weeklyGoal: text, keyDeliverable: text, deadline: text, priority: text,
  risksBlockers: text, reviewNotes: text, learnings: text, nextFocus: text,
})
const dailyRow = z.object({
  date: text, employeeName: text, role: text, manager: text, taskDescription: text,
  whyMatters: text, timeFrom: text, timeTo: text, supportNeeded: text,
  endOfDayStatus: text, carryTomorrow: text, notes: text,
})

const schema = z.object({
  fileBaseName: text.optional(),
  weeklySheetName: text.optional(),
  dailySheetName: text.optional(),
  weekly: z.array(weeklyRow).max(2000),
  daily: z.array(dailyRow).max(4000),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const { fileBaseName, weeklySheetName, dailySheetName, weekly, daily } = parsed.data
    const userId = session.user.id

    // MERGE by the EXACT date text: for any date present in this import, replace
    // the old rows for that same date text; dates not in this import stay.
    const weeklyStarts = weekly.map((r) => r.weekStart).filter((d): d is string => !!d)
    const dailyDates = daily.map((r) => r.date).filter((d): d is string => !!d)

    await prisma.$transaction([
      prisma.weeklyPlannerRow.deleteMany({ where: { userId, weekStart: { in: weeklyStarts } } }),
      prisma.dailyPlannerRow.deleteMany({ where: { userId, date: { in: dailyDates } } }),

      prisma.weeklyPlannerRow.createMany({
        data: weekly.map((r, i) => ({
          userId, rowIndex: i,
          weekStart: r.weekStart,
          weekEnd: r.weekEnd,
          employeeName: r.employeeName,
          role: r.role,
          manager: r.manager,
          weeklyGoal: r.weeklyGoal,
          keyDeliverable: r.keyDeliverable,
          deadline: r.deadline,
          priority: r.priority,
          risksBlockers: r.risksBlockers,
          reviewNotes: r.reviewNotes,
          learnings: r.learnings,
          nextFocus: r.nextFocus,
        })),
      }),

      prisma.dailyPlannerRow.createMany({
        data: daily.map((r, i) => ({
          userId, rowIndex: i,
          date: r.date,
          employeeName: r.employeeName,
          role: r.role,
          manager: r.manager,
          taskDescription: r.taskDescription,
          whyMatters: r.whyMatters,
          timeFrom: r.timeFrom,
          timeTo: r.timeTo,
          supportNeeded: r.supportNeeded,
          endOfDayStatus: r.endOfDayStatus,
          carryTomorrow: r.carryTomorrow,
          notes: r.notes,
        })),
      }),

      prisma.plannerMeta.upsert({
        where: { userId },
        create: { userId, fileBaseName: fileBaseName ?? null, weeklySheetName: weeklySheetName ?? null, dailySheetName: dailySheetName ?? null },
        update: { fileBaseName: fileBaseName ?? null, weeklySheetName: weeklySheetName ?? null, dailySheetName: dailySheetName ?? null },
      }),
    ])

    return NextResponse.json({ weekly: weekly.length, daily: daily.length })
  } catch (e) {
    console.error("[tracker/import-faithful POST]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}