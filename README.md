# Trackr

A full-stack project and time tracking application built with Next.js 14. Manage projects, tickets, sprints, and daily work logs — all in one place.

---

## Features

- **Project Management** — Create projects, assign members, track status and health
- **Ticket Tracking** — Issues, bugs, tasks with priorities, statuses, comments, and watchers
- **Kanban Board** — Drag-and-drop ticket management per project
- **Sprint Planning** — Create sprints, assign tickets, track completion
- **Daily Time Tracker** — Log daily tasks with hours, blockers, and mood
- **Weekly Tracker** — Summarize work week with goals and learnings
- **Excel Import** — Bulk-import time entries from `.xlsx` files (timezone-safe parsing)
- **Notifications** — Alerts for ticket assignments, comments, and status changes
- **Reports** — Project metrics and weekly hours dashboards
- **Role-Based Access** — Admin, Project Manager, Developer, Designer, Viewer roles

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router, Turbopack) |
| Language | TypeScript 5.5 |
| Auth | NextAuth / Auth.js v5 (JWT + Credentials) |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma 5.17 |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Email | Resend + React Email |
| File Upload | UploadThing |
| Charts | Recharts |
| Drag & Drop | @hello-pangea/dnd |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack Query v5 |
| Excel Parsing | xlsx (server-side, timezone-safe) |

---

## Prerequisites

- **Node.js** 18.17 or later
- **npm** 9 or later
- A **PostgreSQL** database — recommended: [Neon](https://neon.tech) (free tier works)
- A **Resend** account for transactional emails — [resend.com](https://resend.com) (free tier works)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd Tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
# PostgreSQL connection string (Neon, Supabase, Railway, or local)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Generate with: openssl rand -base64 32
AUTH_SECRET="your-random-secret-here"

# Must match the URL your app runs on
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

# Resend API key for sending emails
RESEND_API_KEY="re_xxxxxxxxxxxx"

# Sender email address (must be verified in Resend)
RESEND_FROM="noreply@yourdomain.com"

# App URL (same as AUTH_URL for local dev)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Seed script — admin account that gets created on first db:seed
SEED_ADMIN_EMAIL="admin@yourdomain.com"
SEED_ADMIN_PASSWORD="StrongPassword123!"
SEED_ADMIN_NAME="Admin User"
```

> **Security**: Never commit `.env` to version control. It is already listed in `.gitignore`.

### 4. Set up the database

Push the Prisma schema to your database:

```bash
npm run db:push
```

Generate the Prisma client:

```bash
npm run db:generate
```

Seed the database with an admin user and sample data:

```bash
npm run db:seed
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with the credentials you set in `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Turbopack (hot reload) |
| `npm run build` | Create optimised production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Regenerate the Prisma client after schema changes |
| `npm run db:push` | Apply schema changes to the database without migrations |
| `npm run db:migrate` | Create and apply a named migration (recommended for production) |
| `npm run db:studio` | Open Prisma Studio — browser GUI to inspect / edit data |
| `npm run db:seed` | Seed the database with the admin user and sample data |

---

## Running in Production (local)

```bash
# Stop the dev server first, then:
npm run db:generate   # ensure Prisma client matches schema
npm run build         # compile everything
npm run start         # serve on http://localhost:3000
```

> If `db:generate` fails with a "file locked" error, make sure no `npm run dev` or `npm run start` process is running, then retry.

---

## Project Structure

```
Tracker/
├── app/
│   ├── (auth)/              # Login page
│   ├── (dashboard)/         # All authenticated pages
│   │   ├── dashboard/       # Overview stats
│   │   ├── projects/        # Project list + detail + settings
│   │   ├── tickets/         # Ticket list + detail
│   │   ├── sprints/         # Sprint management
│   │   ├── my-tracker/      # Daily / weekly time tracker
│   │   ├── reports/         # Analytics
│   │   ├── team/            # Team management
│   │   ├── notifications/   # Notification centre
│   │   └── settings/        # User settings
│   └── api/                 # API route handlers
│       ├── auth/            # NextAuth endpoints
│       ├── projects/        # Project CRUD
│       ├── tickets/         # Ticket CRUD
│       ├── sprints/         # Sprint CRUD
│       ├── tracker/         # Time tracking + Excel import
│       ├── notifications/   # Notification reads
│       └── users/           # User management
├── components/
│   ├── ui/                  # shadcn/Radix UI primitives
│   ├── layout/              # Sidebar, top navbar
│   ├── dashboard/           # Stats cards, project health
│   ├── projects/            # Kanban board, project forms
│   ├── tickets/             # Ticket tables, detail view
│   ├── tracker/             # Daily/weekly tracker, Excel import
│   └── providers/           # React Query + Session providers
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── db.ts                # Prisma client singleton
│   ├── session.ts           # React.cache auth deduplication
│   ├── mail.ts              # Email service
│   └── utils.ts             # cn() and helpers
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript type definitions
└── prisma/
    ├── schema.prisma        # Database schema
    └── seed.ts              # Database seed script
```

---

## Database Schema Overview

| Model | Purpose |
|---|---|
| `User` | Accounts with roles |
| `Project` | Projects with status, owner, members |
| `ProjectMember` | Many-to-many user ↔ project with role |
| `Ticket` | Issues/tasks with type, status, priority |
| `Sprint` / `SprintItem` | Sprint planning |
| `Comment` | Ticket comments |
| `DailyEntry` / `DailyTask` | Time tracker entries |
| `Notification` | In-app notifications |
| `ActivityLog` | Audit trail of ticket changes |
| `WorkflowStep` | Custom project workflow steps |

---

## Deployment

### Railway (recommended)

1. Push your code to GitHub
2. Create a new Railway project and connect your repo
3. Add a **PostgreSQL** service (or point to Neon via `DATABASE_URL`)
4. Set all environment variables from your `.env` (update `AUTH_URL` and `NEXTAUTH_URL` to your Railway domain)
5. Railway auto-runs `npm run build` and `npm run start`

After first deploy, run the seed once via Railway's shell:

```bash
npm run db:seed
```

### Environment variables for production

Update these values when deploying:

```env
AUTH_URL="https://your-app.railway.app"
NEXTAUTH_URL="https://your-app.railway.app"
NEXT_PUBLIC_APP_URL="https://your-app.railway.app"
```

---

## Excel Import Format

The time tracker supports importing daily or weekly planner `.xlsx` files.

**Daily Planner** — expected columns (header row, any order):

| Column | Required | Notes |
|---|---|---|
| Date | Yes | Any common date format |
| Task Description | Yes | |
| Time Block (From) | No | HH:MM |
| Time Block (To) | No | HH:MM — hours auto-calculated |
| End-of-Day Status | No | "Done", "Blocked", or blank = In Progress |
| Project | No | Mapped to project name |
| Support Needed | No | Treated as blockers |

**Weekly Planner** — expected columns:

| Column | Required | Notes |
|---|---|---|
| Week Start | Yes | Date of Monday |
| Deliverable / Key Task | Yes | |
| Weekly Goal | No | |
| Priority | No | |
| Risk / Blockers | No | |

---

## Troubleshooting

**Login fails with `error=Configuration`**
- Ensure `AUTH_SECRET` is set in `.env`
- Ensure `AUTH_URL` matches the URL you're accessing (e.g. `http://localhost:3000`)
- Run `npm run db:generate` to regenerate the Prisma client, then `npm run build`

**Prisma generate fails with "file locked"**
- Stop all running `npm run dev` and `npm run start` processes, then retry

**Dates shift by -1 day after Excel import**
- This is fixed — the server-side parser uses Excel serial number arithmetic, which is timezone-independent. No action needed.

**First page load is slow (4–6 seconds)**
- This is normal in `npm run dev` (Turbopack compiles on demand)
- In `npm run start` (production), every page loads in under 1 second
