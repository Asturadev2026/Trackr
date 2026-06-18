export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-9 rounded bg-muted" />
          <div className="h-9 w-9 rounded bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-6 w-full rounded bg-muted" />
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-20 rounded-lg bg-muted opacity-75" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
