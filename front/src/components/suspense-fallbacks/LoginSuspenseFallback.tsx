export default function LoginSuspenseFallback() {
  return (
    <div className='flex w-md flex-col gap-2.5'>
      <div className='bg-muted h-8 w-32 animate-pulse rounded' />
      <div className='bg-muted h-10 w-full animate-pulse rounded' />
      <div className='bg-muted h-10 w-full animate-pulse rounded' />
      <div className='bg-muted h-10 w-full animate-pulse rounded' />
      <div className='flex flex-row gap-1'>
        <div className='bg-muted h-4 w-32 animate-pulse rounded' />
        <div className='bg-muted h-4 w-20 animate-pulse rounded' />
      </div>
      <div className='flex flex-row gap-1'>
        <div className='bg-muted h-4 w-32 animate-pulse rounded' />
        <div className='bg-muted h-4 w-24 animate-pulse rounded' />
      </div>
    </div>
  )
}
