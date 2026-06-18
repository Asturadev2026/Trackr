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
