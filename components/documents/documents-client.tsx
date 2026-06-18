"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Search, Plus, FileText, Table2, File, Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { AddDocumentDialog } from "./add-document-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface Doc {
  id: string
  name: string
  url: string
  size: number
  mimeType: string
  createdAt: string
  ticketId: string | null
  ticketKey: string | null
  projectId: string | null
  projectName: string | null
}

type FileType = "all" | "pdf" | "word" | "excel" | "other"

function getFileType(mimeType: string, name: string): Exclude<FileType, "all"> {
  const m = mimeType.toLowerCase()
  const n = name.toLowerCase()
  if (m === "application/pdf" || n.endsWith(".pdf")) return "pdf"
  if (m.includes("wordprocessingml") || m === "application/msword" || n.match(/\.docx?$/)) return "word"
  if (m.includes("spreadsheetml") || m === "application/vnd.ms-excel" || n.match(/\.xlsx?$/)) return "excel"
  return "other"
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const FILE_TYPE_CONFIG = {
  pdf: {
    bg: "bg-red-50",
    icon: <FileText className="h-5 w-5 text-red-500" />,
    label: "PDF",
  },
  word: {
    bg: "bg-blue-50",
    icon: <FileText className="h-5 w-5 text-blue-500" />,
    label: "Word",
  },
  excel: {
    bg: "bg-green-50",
    icon: <Table2 className="h-5 w-5 text-green-500" />,
    label: "Excel",
  },
  other: {
    bg: "bg-slate-100",
    icon: <File className="h-5 w-5 text-slate-500" />,
    label: "File",
  },
}

interface Props {
  docs: Doc[]
  projects: { id: string; name: string }[]
}

export function DocumentsClient({ docs: initialDocs, projects }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const isIntern = session?.user?.role === "INTERN"
  const [docs, setDocs] = useState(initialDocs)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<FileType>("all")
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const filtered = docs.filter((doc) => {
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false
    if (projectFilter && doc.projectId !== projectFilter) return false
    if (typeFilter !== "all" && getFileType(doc.mimeType, doc.name) !== typeFilter) return false
    return true
  })

  const projectsInDocs = Array.from(
    new Map(
      docs.filter((d) => d.projectId && d.projectName).map((d) => [d.projectId, d.projectName])
    ).entries()
  ).map(([id, name]) => ({ id: id!, name: name! }))

  const projectCount = new Set(docs.filter((d) => d.projectId).map((d) => d.projectId)).size

  async function handleDelete(doc: Doc) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    try {
      const res = await fetch(`/api/documents?id=${doc.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success("Document deleted")
    } catch {
      toast.error("Failed to delete document")
    }
  }

  function onUploaded(doc: Doc) {
    setDocs((prev) => [doc, ...prev])
  }

  const typeFilters: { key: FileType; label: string }[] = [
    { key: "all", label: "All types" },
    { key: "pdf", label: "PDF" },
    { key: "word", label: "Word" },
    { key: "excel", label: "Excel" },
  ]

  return (
    <>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {docs.length} file{docs.length !== 1 ? "s" : ""} across {projectCount} project{projectCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add document
          </Button>
        </div>

        {/* Search + Project filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 min-w-[130px] justify-between gap-2">
                {projectFilter
                  ? projectsInDocs.find((p) => p.id === projectFilter)?.name ?? "Project"
                  : "All projects"}
                <span className="text-muted-foreground text-xs">▾</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setProjectFilter(null)}>All projects</DropdownMenuItem>
              {projectsInDocs.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => setProjectFilter(p.id)}>
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Type filter chips */}
        <div className="flex items-center gap-2">
          {typeFilters.map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={cn(
                "rounded-full border px-3.5 py-1 text-sm font-medium transition-colors",
                typeFilter === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Document grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <File className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No documents found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {docs.length === 0 ? "Upload your first document using the button above." : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} canDelete={!isIntern} />
            ))}
          </div>
        )}
      </div>

      <AddDocumentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projects={projects}
        onUploaded={onUploaded}
      />
    </>
  )
}

function DocumentCard({ doc, onDelete, canDelete }: { doc: Doc; onDelete: (doc: Doc) => void; canDelete: boolean }) {
  const fileType = getFileType(doc.mimeType, doc.name)
  const config = FILE_TYPE_CONFIG[fileType]

  return (
    <div className="group relative rounded-xl border bg-card hover:shadow-md transition-all overflow-hidden">
      {/* Entire card opens the file in a new browser tab via preview route */}
      <a href={`/api/preview/${doc.id}`} target="_blank" rel="noopener noreferrer" className="block p-4">
        <div className="mb-4">
          <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", config.bg)}>
            {config.icon}
          </div>
        </div>
        <p className="font-semibold text-sm leading-snug line-clamp-2 mb-1 pr-6">{doc.name}</p>
        <p className="text-xs text-muted-foreground mb-3">
          {formatSize(doc.size)} · {format(new Date(doc.createdAt), "MMM d")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {doc.projectName && (
            <span className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {doc.projectName}
            </span>
          )}
          {doc.ticketKey && (
            <span className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {doc.ticketKey}
            </span>
          )}
        </div>
      </a>

      {/* Actions menu — absolute so it doesn't nest inside the <a> */}
      <div className="absolute top-3 right-3" onClick={(e) => e.preventDefault()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="text-muted-foreground font-bold tracking-widest text-xs">···</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={doc.url} download={doc.name}>
                <Download className="h-3.5 w-3.5 mr-2" />
                Download
              </a>
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(doc)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
