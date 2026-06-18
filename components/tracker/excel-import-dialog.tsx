"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { Loader2, FileSpreadsheet, CheckCircle, AlertCircle, Calendar, CalendarDays } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects?: { id: string; name: string }[]
  currentDate?: string
  onSuccess: () => void
}

type Step = "upload" | "review" | "done"
type SheetType = "weekly" | "daily" | "unknown"

interface ParsedTask {
  description: string
  hours: number
  status: "IN_PROGRESS" | "DONE" | "BLOCKED"
  priority?: string
  projectName?: string
}

interface ParsedEntry {
  date: string
  tasks: ParsedTask[]
  notes?: string
  blockers?: string
  weekGoal?: string
  learnings?: string
  nextFocus?: string
  managerNotes?: string
}

interface SheetResult {
  sheetName: string
  type: SheetType
  entries: ParsedEntry[]
  skipped: number
}

export function ExcelImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [sheets, setSheets] = useState<SheetResult[]>([])
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setFileName(file.name)
    setLoading(true)

    try {
      // Upload to server for parsing — server runs in UTC so dates are always correct
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/tracker/parse-excel", { method: "POST", body })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to parse file")
      }

      const { sheets: parsed } = await res.json() as { sheets: SheetResult[] }

      if (!parsed || parsed.length === 0) {
        toast.error("No recognisable data found in the file")
        return
      }

      setSheets(parsed)
      setStep("review")
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "Failed to parse file — ensure it's a valid .xlsx, .xls, or .csv")
    } finally {
      setLoading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  })

  const totalEntries = sheets.reduce((s, sh) => s + sh.entries.length, 0)
  const totalTasks = sheets.reduce((s, sh) => s + sh.entries.reduce((ss, e) => ss + e.tasks.length, 0), 0)

  const handleImport = async () => {
    setLoading(true)
    try {
      const entries = sheets.flatMap((sh) => sh.entries)
      const res = await fetch("/api/tracker/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error((err as { error?: string }).error ?? "Import failed")
      }
      const result = await res.json() as { imported: number }
      setImportResult(result)
      setStep("done")
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep("upload")
    setFileName("")
    setSheets([])
    setImportResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Import from Excel</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {step === "upload" && "Upload your weekly or daily tracker spreadsheet — both sheets are detected automatically"}
            {step === "review" && `${fileName} — ${totalEntries} date entr${totalEntries === 1 ? "y" : "ies"}, ${totalTasks} task${totalTasks !== 1 ? "s" : ""} ready to import`}
            {step === "done" && "Import complete"}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 overflow-auto">

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-4 ${
                isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <input {...getInputProps()} />
              {loading ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-sm font-medium">Reading spreadsheet…</p>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Drop your Excel file here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse — .xlsx, .xls, .csv</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
                    <div className="rounded-lg border bg-card p-3">
                      <CalendarDays className="h-4 w-4 text-primary mb-1" />
                      <p className="text-xs font-medium">Weekly sheet</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Week start date, Key deliverable, Goals, Learnings…</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <Calendar className="h-4 w-4 text-primary mb-1" />
                      <p className="text-xs font-medium">Daily sheet</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Date, Task description, Time blocks, Status…</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Review detected sheets */}
          {step === "review" && (
            <div className="space-y-4 pb-4">
              {sheets.map((sh) => (
                <div key={sh.sheetName} className="rounded-xl border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                    <div className="flex items-center gap-2">
                      {sh.type === "weekly" ? (
                        <CalendarDays className="h-4 w-4 text-primary" />
                      ) : (
                        <Calendar className="h-4 w-4 text-primary" />
                      )}
                      <span className="font-medium text-sm">{sh.sheetName}</span>
                      <Badge variant={sh.type === "weekly" ? "default" : "secondary"} className="text-[10px]">
                        {sh.type === "weekly" ? "Weekly tracker" : sh.type === "daily" ? "Daily tracker" : "Unknown"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {sh.entries.length} entr{sh.entries.length === 1 ? "y" : "ies"} ·{" "}
                      {sh.entries.reduce((s, e) => s + e.tasks.length, 0)} tasks
                      {sh.skipped > 0 && ` · ${sh.skipped} empty rows skipped`}
                    </span>
                  </div>

                  <div className="divide-y">
                    {sh.entries.map((entry) => (
                      <div key={entry.date} className="px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{entry.date}</span>
                          <span className="text-xs text-muted-foreground">
                            {entry.tasks.reduce((s, t) => s + t.hours, 0).toFixed(1)}h logged
                          </span>
                        </div>

                        <div className="space-y-1">
                          {entry.tasks.map((t, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                              <span className="flex-1 leading-snug">{t.description}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {t.priority && (
                                  <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                                )}
                                <Badge
                                  variant={t.status === "DONE" ? "secondary" : t.status === "BLOCKED" ? "destructive" : "outline"}
                                  className="text-[10px]"
                                >
                                  {t.status === "IN_PROGRESS" ? "In Progress" : t.status}
                                </Badge>
                                {t.hours > 0 && (
                                  <span className="text-xs text-muted-foreground">{t.hours}h</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-0.5">
                          {entry.weekGoal && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Goal:</span>{" "}
                              {entry.weekGoal.substring(0, 100)}{entry.weekGoal.length > 100 ? "…" : ""}
                            </p>
                          )}
                          {entry.blockers && (
                            <p className="text-xs text-amber-700">
                              <span className="font-medium">Blockers:</span>{" "}
                              {entry.blockers.substring(0, 100)}{entry.blockers.length > 100 ? "…" : ""}
                            </p>
                          )}
                          {entry.learnings && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Learnings:</span>{" "}
                              {entry.learnings.substring(0, 100)}{entry.learnings.length > 100 ? "…" : ""}
                            </p>
                          )}
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Notes:</span>{" "}
                              {entry.notes.substring(0, 100)}{entry.notes.length > 100 ? "…" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {totalEntries === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No valid entries found in the file.</p>
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="py-10 text-center space-y-3 pb-4">
              <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
              <p className="text-lg font-semibold">Import complete!</p>
              <p className="text-sm text-muted-foreground">
                {importResult?.imported ?? 0} date entr{(importResult?.imported ?? 0) === 1 ? "y" : "ies"} saved to your tracker.
              </p>
              <p className="text-xs text-muted-foreground">
                Tasks, goals, blockers, learnings and notes are all saved.
              </p>
            </div>
          )}

        </ScrollArea>

        <Separator />
        <DialogFooter className="px-6 py-4">
          {step === "review" && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleImport} disabled={loading || totalEntries === 0}>
                {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Import {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => { reset(); onOpenChange(false) }}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
