import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM ?? "Trackr <onboarding@resend.dev>"

interface MailOptions {
  to: string
  subject: string
  html: string
}

export async function sendMail({ to, subject, html }: MailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email send")
    return
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error("Failed to send email:", err)
  }
}

export function ticketAssignedEmail({
  userName,
  ticketKey,
  ticketTitle,
  projectName,
  assignedBy,
  ticketUrl,
}: {
  userName: string
  ticketKey: string
  ticketTitle: string
  projectName: string
  assignedBy: string
  ticketUrl: string
}) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1e293b">You've been assigned a ticket</h2>
      <p>Hi ${userName},</p>
      <p><strong>${assignedBy}</strong> assigned you a ticket in <strong>${projectName}</strong>.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;font-size:12px;color:#64748b">${ticketKey}</p>
        <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1e293b">${ticketTitle}</p>
      </div>
      <a href="${ticketUrl}" style="display:inline-block;background:#7ba4d4;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500">
        View Ticket →
      </a>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8">Trackr — Project Management</p>
    </div>
  `
}

export function ticketCommentEmail({
  userName,
  commenterName,
  ticketKey,
  ticketTitle,
  comment,
  ticketUrl,
}: {
  userName: string
  commenterName: string
  ticketKey: string
  ticketTitle: string
  comment: string
  ticketUrl: string
}) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1e293b">New comment on ${ticketKey}</h2>
      <p>Hi ${userName},</p>
      <p><strong>${commenterName}</strong> commented on <strong>${ticketTitle}</strong>:</p>
      <div style="background:#f8fafc;border-left:4px solid #7ba4d4;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0">
        <p style="margin:0;color:#334155">${comment.substring(0, 300)}${comment.length > 300 ? "..." : ""}</p>
      </div>
      <a href="${ticketUrl}" style="display:inline-block;background:#7ba4d4;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500">
        View Comment →
      </a>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8">Trackr — Project Management</p>
    </div>
  `
}

export function mentionEmail({
  userName,
  mentionedBy,
  ticketKey,
  ticketTitle,
  context,
  ticketUrl,
}: {
  userName: string
  mentionedBy: string
  ticketKey: string
  ticketTitle: string
  context: string
  ticketUrl: string
}) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1e293b">You were mentioned in ${ticketKey}</h2>
      <p>Hi ${userName},</p>
      <p><strong>${mentionedBy}</strong> mentioned you in <strong>${ticketTitle}</strong>:</p>
      <div style="background:#f8fafc;border-left:4px solid #7ba4d4;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0">
        <p style="margin:0;color:#334155">${context.substring(0, 300)}${context.length > 300 ? "..." : ""}</p>
      </div>
      <a href="${ticketUrl}" style="display:inline-block;background:#7ba4d4;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500">
        View Ticket →
      </a>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8">Trackr — Project Management</p>
    </div>
  `
}
export interface WeeklySummaryUser {
  name: string | null
  email: string
  role: string
  dailyEntries: Array<{
    date: Date | string
    notes: string | null
    blockers: string | null
    tasks: Array<{
      projectName: string | null
      description: string
      hours: number
      status: string
    }>
  }>
}

export function weeklySummaryEmail({
  usersData,
  startDate,
  endDate,
}: {
  usersData: WeeklySummaryUser[]
  startDate: string
  endDate: string
}) {
  let teamSummaryHtml = ""

  for (const user of usersData) {
    const name = user.name || user.email
    const roleColors: Record<string, { bg: string; text: string }> = {
      ADMIN: { bg: "#fee2e2", text: "#991b1b" },
      MANAGER: { bg: "#fef3c7", text: "#92400e" },
      SENIOR_ENGINEER: { bg: "#dbeafe", text: "#1e40af" },
      AI_ENGINEER: { bg: "#e0e7ff", text: "#3730a3" },
      INTERN: { bg: "#f3f4f6", text: "#374151" },
      BUSINESS: { bg: "#fae8ff", text: "#86198f" },
    }
    const colors = roleColors[user.role] || { bg: "#e2e8f0", text: "#1e293b" }
    const entries = user.dailyEntries || []

    teamSummaryHtml += `
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:20px; margin-bottom:20px; box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:12px; margin-bottom:16px">
          <span style="font-size:16px; font-weight:600; color:#0f172a">${name}</span>
          <span style="background:${colors.bg}; color:${colors.text}; font-size:11px; font-weight:600; padding:3px 8px; border-radius:12px; text-transform:uppercase; letter-spacing:0.5px">${user.role}</span>
        </div>
    `

    if (entries.length === 0) {
      teamSummaryHtml += `<p style="color:#64748b; font-style:italic; font-size:14px; margin:0">No work updates logged this week.</p>`
    } else {
      teamSummaryHtml += `<div style="display:flex; flex-direction:column; gap:16px">`
      for (const entry of entries) {
        const dateObj = new Date(entry.date)
        const formattedDate = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

        let tasksHtml = ""
        for (const task of entry.tasks) {
          const isDone = task.status === "DONE"
          const isBlocked = task.status === "BLOCKED"
          const statusBg = isDone ? "#d1fae5" : isBlocked ? "#fee2e2" : "#fef3c7"
          const statusText = isDone ? "#065f46" : isBlocked ? "#991b1b" : "#92400e"

          tasksHtml += `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:8px 0; border-bottom:1px dashed #f1f5f9">
              <div style="flex:1; padding-right:12px">
                <span style="font-size:11px; background:#f1f5f9; color:#475569; padding:2px 6px; border-radius:4px; font-weight:500; margin-right:6px">${task.projectName || "General"}</span>
                <span style="font-size:13px; color:#334155">${task.description}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px; flex-shrink:0">
                <span style="font-size:12px; font-weight:600; color:#475569">${task.hours}h</span>
                <span style="background:${statusBg}; color:${statusText}; font-size:10px; font-weight:600; padding:1px 6px; border-radius:4px">${task.status}</span>
              </div>
            </div>
          `
        }

        teamSummaryHtml += `
          <div style="background:#f8fafc; border-radius:8px; padding:12px 16px">
            <div style="font-size:13px; font-weight:600; color:#475569; margin-bottom:8px">${formattedDate}</div>
            ${entry.notes ? `<div style="font-size:13px; color:#1e293b; font-weight:500; margin-bottom:8px; line-height:1.5">${entry.notes}</div>` : ""}
            <div>${tasksHtml}</div>
            ${entry.blockers ? `<div style="margin-top:8px; font-size:12px; color:#b91c1c; background:#fef2f2; border:1px solid #fee2e2; border-radius:6px; padding:6px 10px">⚠️ <strong>Blockers:</strong> ${entry.blockers}</div>` : ""}
          </div>
        `
      }
      teamSummaryHtml += `</div>`
    }

    teamSummaryHtml += `</div>`
  }

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f1f5f9; padding:40px 20px">
      <div style="max-width:650px; margin:0 auto">
        <div style="text-align:center; margin-bottom:30px">
          <h1 style="color:#0f172a; font-size:24px; font-weight:700; margin:0 0 6px 0">Weekly Work Summary</h1>
          <p style="color:#64748b; font-size:14px; margin:0">Reporting period: <strong>${startDate}</strong> to <strong>${endDate}</strong></p>
        </div>
        ${teamSummaryHtml}
        <div style="text-align:center; margin-top:30px; font-size:12px; color:#94a3b8">
          <p style="margin:0 0 4px 0">Trackr — Team Status & Project Management</p>
          <p style="margin:0">This is an automated system email.</p>
        </div>
      </div>
    </div>
  `
}
