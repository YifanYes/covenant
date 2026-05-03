'use client'
export default function FormError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p className="text-destructive text-sm" role="alert">
      {message}
    </p>
  )
}
