/**
 * Trackr MCP Server
 *
 * What this file does:
 *  - Creates an MCP server using the official Anthropic SDK
 *  - Registers tools that Claude can call (create_ticket, list_tickets, etc.)
 *  - Each tool makes an authenticated HTTP request to the Trackr API
 *  - Communicates with Claude Code over stdin/stdout (the SDK handles this)
 *
 * Environment variables required (set in .mcp.json or your shell):
 *  TRACKR_BASE_URL  — e.g. https://trackr-two-sigma.vercel.app
 *  TRACKR_API_KEY   — the secret you set in Vercel as MCP_API_KEY
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

// ── Config ────────────────────────────────────────────────────────────────────
// Read from env vars — never hardcode secrets
const BASE_URL = process.env.TRACKR_BASE_URL?.replace(/\/$/, "") ?? ""
const API_KEY  = process.env.TRACKR_API_KEY  ?? ""

if (!BASE_URL || !API_KEY) {
  console.error("TRACKR_BASE_URL and TRACKR_API_KEY must be set")
  process.exit(1)
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
// Every request we make to Trackr carries the API key as a Bearer token.
// This is the same header that lib/api-auth.ts checks on the server.
async function api(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...options.headers,
    },
  })

  const text = await res.text()

  if (!res.ok) {
    // Surface the server error message so Claude can explain it to you
    let message = text
    try { message = JSON.parse(text).error ?? text } catch {}
    throw new Error(`Trackr API error ${res.status}: ${message}`)
  }

  return JSON.parse(text)
}

// ── Create the MCP server ─────────────────────────────────────────────────────
// McpServer is the main class from the SDK. You give it a name and version,
// then register tools on it. Claude Code discovers these tools automatically.
const server = new McpServer({
  name: "trackr",
  version: "1.0.0",
})

// ── Tool: list_projects ───────────────────────────────────────────────────────
// Claude needs to know project IDs before creating tickets. This tool lets it
// (and you) see all your projects.
server.tool(
  "list_projects",
  "List all Trackr projects. Use this first to find the projectId needed for other tools.",
  {},  // no parameters needed
  async () => {
    const data = await api("/api/projects?simple=true")
    const projects = data.data ?? data

    if (!projects.length) return { content: [{ type: "text", text: "No projects found." }] }

    const lines = projects.map((p: { id: string; name: string; status?: string }) =>
      `• ${p.name}  (id: ${p.id})${p.status ? `  [${p.status}]` : ""}`
    )
    return {
      content: [{
        type: "text",
        text: `**Your projects:**\n${lines.join("\n")}`,
      }],
    }
  }
)

// ── Tool: list_users ──────────────────────────────────────────────────────────
// Needed so Claude can resolve "assign to Priya" → a real userId
server.tool(
  "list_users",
  "List all active Trackr users with their IDs and roles. Use this to find assigneeId values.",
  {},
  async () => {
    const data = await api("/api/users")
    const users = data.data ?? data

    const lines = users.map((u: { id: string; name: string; email: string; role: string }) =>
      `• ${u.name}  <${u.email}>  role: ${u.role}  (id: ${u.id})`
    )
    return {
      content: [{
        type: "text",
        text: `**Team members:**\n${lines.join("\n")}`,
      }],
    }
  }
)

// ── Tool: list_tickets ────────────────────────────────────────────────────────
// Flexible search/filter over all tickets. Every parameter is optional.
server.tool(
  "list_tickets",
  "Search and filter Trackr tickets. All parameters are optional — omit any you don't need.",
  {
    projectId:  z.string().optional().describe("Filter by project ID"),
    status:     z.enum(["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]).optional(),
    priority:   z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    type:       z.enum(["BUG", "FEATURE", "TASK", "IMPROVEMENT", "QUESTION"]).optional(),
    assigneeId: z.string().optional().describe("Filter by assignee user ID"),
    search:     z.string().optional().describe("Search in title and ticket key"),
    pageSize:   z.number().int().min(1).max(50).default(20).describe("Max results to return"),
  },
  async ({ projectId, status, priority, type, assigneeId, search, pageSize }) => {
    const params = new URLSearchParams()
    if (projectId)  params.set("projectId",  projectId)
    if (status)     params.set("status",     status)
    if (priority)   params.set("priority",   priority)
    if (type)       params.set("type",       type)
    if (assigneeId) params.set("assigneeId", assigneeId)
    if (search)     params.set("q",          search)
    if (pageSize)   params.set("pageSize",   String(pageSize))

    const data = await api(`/api/tickets?${params}`)
    const tickets = data.data ?? []

    if (!tickets.length) return { content: [{ type: "text", text: "No tickets match your filters." }] }

    const lines = tickets.map((t: {
      ticketKey: string; title: string; status: string;
      priority: string; assignee?: { name: string }; project?: { name: string }
    }) =>
      `• [${t.ticketKey}] ${t.title}\n  Status: ${t.status}  Priority: ${t.priority}` +
      `  Project: ${t.project?.name ?? "—"}  Assignee: ${t.assignee?.name ?? "unassigned"}`
    )

    return {
      content: [{
        type: "text",
        text: `**${tickets.length} ticket(s) found:**\n\n${lines.join("\n\n")}`,
      }],
    }
  }
)

// ── Tool: create_ticket ───────────────────────────────────────────────────────
// The most important tool. Creates a ticket in your tracker just like clicking
// "New Ticket" in the UI — including assigning it, setting due dates, etc.
server.tool(
  "create_ticket",
  "Create a new ticket in Trackr. Use list_projects first if you don't know the projectId.",
  {
    title:       z.string().min(1).max(200).describe("Ticket title"),
    projectId:   z.string().describe("ID of the project this ticket belongs to"),
    type:        z.enum(["BUG", "FEATURE", "TASK", "IMPROVEMENT", "QUESTION"]).default("TASK"),
    priority:    z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    description: z.string().optional().describe("Detailed description (markdown supported)"),
    assigneeId:  z.string().optional().describe("User ID to assign — use list_users to find IDs"),
    dueDate:     z.string().optional().describe("Due date in YYYY-MM-DD format"),
  },
  async (input) => {
    const ticket = await api("/api/tickets", {
      method: "POST",
      body: JSON.stringify(input),
    })

    return {
      content: [{
        type: "text",
        text: `✅ Ticket created!\n\n**[${ticket.ticketKey}] ${ticket.title}**\n` +
          `Type: ${ticket.type}  Priority: ${ticket.priority}  Status: ${ticket.status}\n` +
          `Project: ${ticket.project?.name ?? input.projectId}\n` +
          (ticket.assignee ? `Assigned to: ${ticket.assignee.name}\n` : "") +
          (ticket.dueDate  ? `Due: ${ticket.dueDate.split("T")[0]}\n`  : ""),
      }],
    }
  }
)

// ── Tool: update_ticket ───────────────────────────────────────────────────────
// Change any field on an existing ticket — status, priority, assignee, title.
// You can use the ticket key (e.g. "PAY-42") or the raw ID.
server.tool(
  "update_ticket",
  "Update an existing ticket. Provide the ticketKey (e.g. PAY-42) or ticket ID, plus fields to change.",
  {
    ticketKey:   z.string().describe("Ticket key like PAY-42, or the ticket's raw ID"),
    status:      z.enum(["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]).optional(),
    priority:    z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    type:        z.enum(["BUG", "FEATURE", "TASK", "IMPROVEMENT", "QUESTION"]).optional(),
    assigneeId:  z.string().optional().describe("New assignee user ID, or 'unassign' to remove"),
    title:       z.string().optional(),
    description: z.string().optional(),
    dueDate:     z.string().optional().describe("YYYY-MM-DD or empty string to clear"),
  },
  async ({ ticketKey, ...fields }) => {
    // First: resolve the key to an ID (the PATCH endpoint needs the raw ID)
    const search = await api(`/api/tickets?q=${encodeURIComponent(ticketKey)}&pageSize=5`)
    const found  = (search.data ?? []).find((t: { ticketKey: string; id: string }) =>
      t.ticketKey.toLowerCase() === ticketKey.toLowerCase()
    )

    const id = found?.id ?? ticketKey // fallback: treat the input as a raw ID

    // Strip undefined fields so we don't send nulls the server rejects
    const body: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) body[k] = v === "unassign" ? null : v
    }

    const updated = await api(`/api/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })

    return {
      content: [{
        type: "text",
        text: `✅ Ticket updated!\n\n**[${updated.ticketKey}] ${updated.title}**\n` +
          `Status: ${updated.status}  Priority: ${updated.priority}\n` +
          `Assignee: ${updated.assignee?.name ?? "unassigned"}`,
      }],
    }
  }
)

// ── Tool: add_comment ─────────────────────────────────────────────────────────
// Post a comment on a ticket. Useful after resolving a bug, in code reviews, etc.
server.tool(
  "add_comment",
  "Add a comment to an existing ticket.",
  {
    ticketKey: z.string().describe("Ticket key like PAY-42 or the raw ticket ID"),
    comment:   z.string().min(1).describe("The comment text (markdown supported)"),
  },
  async ({ ticketKey, comment }) => {
    // Resolve key → ID (same logic as update_ticket)
    const search = await api(`/api/tickets?q=${encodeURIComponent(ticketKey)}&pageSize=5`)
    const found  = (search.data ?? []).find((t: { ticketKey: string; id: string }) =>
      t.ticketKey.toLowerCase() === ticketKey.toLowerCase()
    )
    const id = found?.id ?? ticketKey

    await api(`/api/tickets/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content: comment }),
    })

    return {
      content: [{
        type: "text",
        text: `✅ Comment added to ${ticketKey}.`,
      }],
    }
  }
)

// ── Start the server ──────────────────────────────────────────────────────────
// StdioServerTransport connects this process to Claude Code via stdin/stdout.
// Claude Code launches this process; the two communicate via JSON messages.
// You never interact with this transport directly — the SDK handles it.
const transport = new StdioServerTransport()
await server.connect(transport)

// This line only prints during development — in normal use the process is silent
console.error("Trackr MCP server running")
