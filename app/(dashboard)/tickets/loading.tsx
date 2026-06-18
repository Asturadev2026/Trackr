export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded bg-muted" />
        <div className="h-9 w-28 rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-28 rounded bg-muted" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-10 rounded bg-muted" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-14 rounded bg-muted opacity-75" />
        ))}
      </div>
    </div>
  )
}
