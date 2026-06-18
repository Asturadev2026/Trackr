export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* week strip */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 flex-1 rounded-lg bg-muted" />
        ))}
      </div>
      {/* date header */}
      <div className="h-6 w-48 rounded bg-muted" />
      {/* task rows */}
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-9 w-32 rounded bg-muted" />
    </div>
  )
}
