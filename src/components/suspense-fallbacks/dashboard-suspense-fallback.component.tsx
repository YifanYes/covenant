'use client'
export default function DashboardSuspenseFallback() {
  return (
    <div className="flex min-h-screen w-full flex-col gap-6 p-6">
      <div className="bg-muted h-8 w-32 animate-pulse rounded" />

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted col-span-2 h-40 animate-pulse rounded" />
        <div className="bg-muted h-40 animate-pulse rounded" />

        <div className="bg-muted h-32 animate-pulse rounded" />
        <div className="bg-muted col-span-2 h-32 animate-pulse rounded" />

        <div className="bg-muted col-span-3 h-48 animate-pulse rounded" />
      </div>
    </div>
  )
}
