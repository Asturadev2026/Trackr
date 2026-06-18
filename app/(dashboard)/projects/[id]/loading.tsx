export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
        </div>
        <div className="h-9 w-24 rounded bg-muted" />
      </div>
      {/* tabs */}
      <div className="flex gap-2 border-b pb-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-24 rounded bg-muted" />
        ))}
      </div>
      {/* content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-32 rounded-lg bg-muted" />
          <div className="h-48 rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  )
}
