import { Loader } from '@nsmr/pixelart-react'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader className="h-10 w-10 animate-spin" />
    </div>
  )
}
