export default function CalendarSuspenseFallback() {
  return (
    <div className='flex h-screen'>
      <div className='flex-1 p-4'>
        <div className='bg-muted h-full w-full animate-pulse rounded' />
      </div>

      <div className='w-60 border-l border-gray-700 p-4'>
        <div className='bg-muted mb-4 h-6 w-24 animate-pulse rounded' />
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='bg-muted h-20 w-full animate-pulse rounded' />
          ))}
        </div>
      </div>
    </div>
  )
}
