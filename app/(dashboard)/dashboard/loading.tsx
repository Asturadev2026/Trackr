export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-7 w-52 rounded bg-muted" />
        <div className="h-4 w-80 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-72 rounded-lg bg-muted" />
        <div className="h-72 rounded-lg bg-muted" />
      </div>
    </div>
  )
}
