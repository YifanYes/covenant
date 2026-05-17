'use client'

const TaskSkeleton = () => (
  <li className="group border-input flex items-center gap-3 border-b p-3 px-2 last:border-b-0">
    <div className="bg-muted/40 h-3 w-3 shrink-0 animate-pulse rounded-full" />
    <div className="flex flex-1 flex-col gap-2">
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
    </div>
  </li>
)

export default TaskSkeleton
