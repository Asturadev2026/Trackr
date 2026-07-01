/**
 * Remote MCP endpoint — speaks the MCP protocol over stateless HTTP.
 *
 * How it works:
 *  Claude Code sends POST requests with JSON-RPC 2.0 bodies.
 *  Each request is independent — no sessions, no SSE, no persistent connections.
 *  This works perfectly on Vercel serverless functions.
 *
 * Auth: Bearer token in Authorization header → looked up via SHA-256 hash in DB.
 *
 * JSON-RPC methods handled:
 *   initialize        — handshake: tell Claude what protocol version we speak
 *   tools/list        — return the list of available tools with their schemas
 *   tools/call        — execute a tool and return the result
 *   ping              — health check
 */

import { NextRequest, NextResponse } from "next/server"
import { authenticate } from "@/lib/api-auth"
import { prisma } from "@/lib/db"
import { generateTicketKey } from "@/lib/utils"

export const dynamic = "force-dynamic"

// ── Tool definitions ───────────────────────────────────────────────────────────
// inputSchema follows JSON Schema — Claude reads this to know what args to pass.
const TOOLS = [
  {
    name: "list_projects",
    description: "List all Trackr projects you have access to. Run this first to get projectId values needed by other tools.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_users",
    description: "List all active team members with their IDs, emails and roles. Run this to resolve names to assigneeId values.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_tickets",
    description: "Search and filter tickets. All parameters are optional — omit any you don't need.",
    inputSchema: {
      type: "object",
      properties: {
        projectId:  { type: "string",  description: "Filter by project ID" },
        status:     { type: "string",  enum: ["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"] },
        priority:   { type: "string",  enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        type:       { type: "string",  enum: ["BUG", "FEATURE", "TASK", "IMPROVEMENT", "QUESTION"] },
        assigneeId: { type: "string",  description: "Filter by assignee ID" },
        search:     { type: "string",  description: "Search in title and ticket key" },
        pageSize:   { type: "number",  description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "create_ticket",
    description: "Create a new ticket. Use list_projects first if you don't have a projectId.",
    inputSchema: {
      type: "object",
      required: ["title", "projectId"],
      properties: {
        title:       { type: "string", description: "Ticket title" },
        projectId:   { type: "string", description: "Project ID from list_projects" },
        type:        { type: "string", enum: ["BUG", "FEATURE", "TASK", "IMPROVEMENT", "QUESTION"], description: "Default: TASK" },
        priority:    { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], description: "Default: MEDIUM" },
        description: { type: "string" },
        assigneeId:  { type: "string", description: "User ID from list_users" },
        dueDate:     { type: "string", description: "YYYY-MM-DD format" },
      },
    },
  },
  {
    name: "update_ticket",
    description: "Update an existing ticket. Use the ticket key (e.g. PAY-42) or raw ID.",
    inputSchema: {
      type: "object",
      required: ["ticketKey"],
      properties: {
        ticketKey:   { type: "string", description: "e.g. PAY-42 or the ticket's raw ID" },
        status:      { type: "string", enum: ["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"] },
        priority:    { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        assigneeId:  { type: "string", description: "User ID, or empty string to unassign" },
        title:       { type: "string" },
        description: { type: "string" },
        dueDate:     { type: "string", description: "YYYY-MM-DD, or empty string to clear" },
      },
    },
  },
  {
    name: "add_comment",
    description: "Add a comment to an existing ticket.",
    inputSchema: {
      type: "object",
      required: ["ticketKey", "comment"],
      properties: {
        ticketKey: { type: "string", description: "e.g. PAY-42" },
        comment:   { type: "string", description: "Comment text (markdown supported)" },
      },
    },
  },
]

// ── Tool handlers ──────────────────────────────────────────────────────────────
async function callTool(name: string, args: Record<string, unknown>, userId: string): Promise<string> {
  switch (name) {

    case "list_projects": {
      const projects = await prisma.project.findMany({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        select: { id: true, name: true, status: true },
        orderBy: { updatedAt: "desc" },
      })
      if (!projects.length) return "No projects found."
      return "**Your projects:**\n" + projects.map(p =>
        `• ${p.name}  [${p.status}]  (id: ${p.id})`
      ).join("\n")
    }

    case "list_users": {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: "asc" },
      })
      return "**Team members:**\n" + users.map(u =>
        `• ${u.name}  <${u.email}>  ${u.role}  (id: ${u.id})`
      ).join("\n")
    }

    case "list_tickets": {
      const { projectId, status, priority, type, assigneeId, search, pageSize = 20 } = args as Record<string, string | number | undefined>
      const where: Record<string, unknown> = {}
      if (projectId)  where.projectId  = projectId
      if (status)     where.status     = status
      if (priority)   where.priority   = priority
      if (type)       where.type       = type
      if (assigneeId) where.assigneeId = assigneeId
      if (search)     where.OR = [
        { title:     { contains: search, mode: "insensitive" } },
        { ticketKey: { contains: search, mode: "insensitive" } },
      ]

      const tickets = await prisma.ticket.findMany({
        where,
        include: {
          project:  { select: { name: true } },
          assignee: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: Number(pageSize),
      })

      if (!tickets.length) return "No tickets match your filters."
      return `**${tickets.length} ticket(s):**\n\n` + tickets.map(t =>
        `[${t.ticketKey}] ${t.title}\n  Status: ${t.status}  Priority: ${t.priority}  ` +
        `Project: ${t.project?.name ?? "—"}  Assignee: ${t.assignee?.name ?? "unassigned"}`
      ).join("\n\n")
    }

    case "create_ticket": {
      const { title, projectId, type = "TASK", priority = "MEDIUM", description, assigneeId, dueDate } = args as Record<string, string | undefined>
      if (!title || !projectId) return "title and projectId are required."

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true },
      })
      if (!project) return `Project ${projectId} not found. Use list_projects to find valid IDs.`

      const count = await prisma.ticket.count({ where: { projectId } })
      const ticketKey = generateTicketKey(project.name, count)

      const ticket = await prisma.ticket.create({
        data: {
          title,
          description:  description ?? null,
          type:         type as any,
          priority:     priority as any,
          status:       "OPEN",
          projectId,
          reporterId:   userId,
          assigneeId:   assigneeId ?? null,
          dueDate:      dueDate ? new Date(dueDate) : null,
          ticketKey,
          order:        count,
        },
        include: {
          project:  { select: { name: true } },
          assignee: { select: { name: true } },
        },
      })

      return `✅ **Ticket created!**\n\n` +
        `**[${ticket.ticketKey}] ${ticket.title}**\n` +
        `Type: ${ticket.type}  Priority: ${ticket.priority}  Status: ${ticket.status}\n` +
        `Project: ${ticket.project?.name}\n` +
        (ticket.assignee ? `Assignee: ${ticket.assignee.name}\n` : "Assignee: unassigned\n") +
        (dueDate ? `Due: ${dueDate}\n` : "")
    }

    case "update_ticket": {
      const { ticketKey, ...updates } = args as Record<string, string | undefined>
      if (!ticketKey) return "ticketKey is required."

      const ticket = await prisma.ticket.findFirst({
        where: { ticketKey: { equals: ticketKey, mode: "insensitive" } },
      })
      if (!ticket) return `Ticket "${ticketKey}" not found.`

      const data: Record<string, unknown> = {}
      if (updates.status      !== undefined) data.status      = updates.status
      if (updates.priority    !== undefined) data.priority    = updates.priority
      if (updates.title       !== undefined) data.title       = updates.title
      if (updates.description !== undefined) data.description = updates.description
      if (updates.assigneeId  !== undefined) data.assigneeId  = updates.assigneeId || null
      if (updates.dueDate     !== undefined) data.dueDate     = updates.dueDate ? new Date(updates.dueDate) : null

      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data,
        include: { assignee: { select: { name: true } } },
      })

      return `✅ **Ticket updated!**\n\n` +
        `**[${ticketKey}]** Status: ${updated.status}  Priority: ${updated.priority}  ` +
        `Assignee: ${updated.assignee?.name ?? "unassigned"}`
    }

    case "add_comment": {
      const { ticketKey, comment } = args as Record<string, string | undefined>
      if (!ticketKey || !comment) return "ticketKey and comment are required."

      const ticket = await prisma.ticket.findFirst({
        where: { ticketKey: { equals: ticketKey, mode: "insensitive" } },
      })
      if (!ticket) return `Ticket "${ticketKey}" not found.`

      await prisma.comment.create({
        data: { ticketId: ticket.id, authorId: userId, content: comment },
      })

      return `✅ Comment added to [${ticketKey}]`
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ── JSON-RPC helpers ───────────────────────────────────────────────────────────
function ok(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result })
}
function err(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } })
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await authenticate(req)
  if (!session) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized — provide a valid API key" } },
      { status: 401 }
    )
  }

  let body: { method: string; params?: unknown; id?: unknown }
  try {
    body = await req.json()
  } catch {
    return err(null, -32700, "Parse error")
  }

  const { method, params, id } = body

  try {
    switch (method) {

      // Handshake — Claude sends this first to confirm protocol compatibility
      case "initialize":
        return ok(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "trackr", version: "1.0.0" },
        })

      // Claude confirms it received the initialize response
      case "notifications/initialized":
        return new NextResponse(null, { status: 204 })

      // List available tools
      case "tools/list":
        return ok(id, { tools: TOOLS })

      // Execute a tool
      case "tools/call": {
        const { name, arguments: toolArgs = {} } = params as { name: string; arguments?: Record<string, unknown> }
        const text = await callTool(name, toolArgs, session.user.id)
        return ok(id, { content: [{ type: "text", text }] })
      }

      case "ping":
        return ok(id, {})

      default:
        return err(id, -32601, `Method not found: ${method}`)
    }
  } catch (e) {
    console.error("[mcp POST]", e)
    return err(id, -32603, e instanceof Error ? e.message : "Internal error")
  }
}
