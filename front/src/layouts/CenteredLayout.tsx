import { Outlet } from 'react-router'

export default function CenteredLayout() {
  return (
    <div className="h-screen flex justify-center items-center">
      <div className="max-w-lg p-4 flex flex-col gap-2">
        <Outlet />
      </div>
    </div>
  )
}
