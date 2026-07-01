import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendMail, weeklySummaryEmail } from "@/lib/mail"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    try {
        // 1. Authorization Check
        const { searchParams } = new URL(req.url)
        const token = searchParams.get("token")
        const authHeader = req.headers.get("authorization")

        const cronSecret = process.env.CRON_SECRET

        // Validate request if CRON_SECRET is set
        if (cronSecret) {
            const isAuthorized =
                token === cronSecret ||
                authHeader === `Bearer ${cronSecret}`

            if (!isAuthorized) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            }
        }

        // 2. Determine week date range (Monday - Friday)
        const weekStart = new Date()
        const day = weekStart.getUTCDay()
        const diff = day === 0 ? -6 : 1 - day
        weekStart.setUTCDate(weekStart.getUTCDate() + diff)
        weekStart.setUTCHours(0, 0, 0, 0)

        const weekEnd = new Date(weekStart)
        weekEnd.setUTCDate(weekStart.getUTCDate() + 4)
        weekEnd.setUTCHours(23, 59, 59, 999)

        const startDateStr = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
        const endDateStr = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })

        // 3. Fetch active users and their entries + tasks for this week
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: {
                name: true,
                email: true,
                role: true,
                dailyEntries: {
                    where: {
                        date: {
                            gte: weekStart,
                            lte: weekEnd,
                        },
                    },
                    include: {
                        tasks: true,
                    },
                    orderBy: {
                        date: "asc",
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        })

        // 4. Generate the weekly summary HTML email
        const emailHtml = weeklySummaryEmail({
            usersData: users,
            startDate: startDateStr,
            endDate: endDateStr,
        })

        // 5. Fetch all active user emails
        const recipients = users.map((u) => u.email).filter(Boolean) as string[]

        if (recipients.length === 0) {
            return NextResponse.json({ message: "No active users found to send email to." })
        }

        // 6. Send email to all recipients
        await Promise.all(
            recipients.map((email) =>
                sendMail({
                    to: email,
                    subject: `Weekly Team Work Summary [${startDateStr} - ${endDateStr}]`,
                    html: emailHtml,
                })
            )
        )

        return NextResponse.json({
            success: true,
            message: `Weekly summary emails successfully sent to ${recipients.length} team members.`,
            recipients,
        })
    } catch (e) {
        console.error("[weekly-summary cron error]", e)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
