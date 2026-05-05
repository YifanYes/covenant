'use client'
import { MoreVertical as DragAndDrop } from 'pixelarticons/react'

const TaskSkeleton = () => (
  <li className="group border-input flex items-center gap-3 border-b p-3 px-2 last:border-b-0">
    <DragAndDrop className="drag-handle text-muted-foreground/40 cursor-pointer" />
    <div className="flex flex-1 flex-col gap-2">
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
    </div>
  </li>
)

export default TaskSkeleton
