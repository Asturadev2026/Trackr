"use client"

import { useRef, useState } from "react"
import { Loader2, UploadCloud, X, FileText, Table2, File } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Doc } from "./documents-client"

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.png,.jpg,.jpeg"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: { id: string; name: string }[]
  onUploaded: (doc: Doc) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType, name }: { mimeType: string; name: string }) {
  const m = mimeType.toLowerCase()
  const n = name.toLowerCase()
  if (m === "application/pdf" || n.endsWith(".pdf"))
    return <FileText className="h-5 w-5 text-red-500" />
  if (m.includes("wordprocessingml") || n.match(/\.docx?$/))
    return <FileText className="h-5 w-5 text-blue-500" />
  if (m.includes("spreadsheetml") || n.match(/\.xlsx?$/))
    return <Table2 className="h-5 w-5 text-green-500" />
  return <File className="h-5 w-5 text-slate-500" />
}

export function AddDocumentDialog({ open, onOpenChange, projects, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [projectId, setProjectId] = useState<string>("")
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleClose() {
    if (loading) return
    setFile(null)
    setProjectId("")
    onOpenChange(false)
  }

  function pickFile(f: File) {
    setFile(f)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) pickFile(f)
    e.target.value = ""
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      if (projectId) fd.append("projectId", projectId)

      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Upload failed")
      }
      const attachment = await res.json()

      const project = projects.find((p) => p.id === projectId) ?? null
      const doc: Doc = {
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        size: attachment.size,
        mimeType: attachment.mimeType,
        createdAt: attachment.createdAt,
        ticketId: null,
        ticketKey: null,
        projectId: projectId || null,
        projectName: project?.name ?? null,
      }

      onUploaded(doc)
      toast.success(`"${file.name}" uploaded`)
      handleClose()
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Drop zone */}
          {!file ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors cursor-pointer",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Drop a file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-0.5">PDF, Word, Excel, and more</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={onInputChange}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
              <div className="h-9 w-9 rounded-lg bg-background border flex items-center justify-center shrink-0">
                <FileIcon mimeType={file.type} name={file.name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Project selector */}
          <div className="space-y-1.5">
            <Label>Link to project <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
