export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* breadcrumb */}
      <div className="h-4 w-48 rounded bg-muted" />
      {/* title */}
      <div className="space-y-2">
        <div className="h-7 w-3/4 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-muted" />
          <div className="h-6 w-20 rounded-full bg-muted" />
          <div className="h-6 w-16 rounded-full bg-muted" />
        </div>
      </div>
      {/* body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-32 rounded-lg bg-muted" />
          <div className="h-6 w-24 rounded bg-muted" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted opacity-75" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
