import { Outlet } from 'react-router'

export default function CenteredLayout() {
  return (
    <div className='flex h-screen items-center justify-center'>
      <div className='flex flex-col gap-2 p-4'>
        <Outlet />
      </div>
    </div>
  )
}
