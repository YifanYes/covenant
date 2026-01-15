export default function FormLabel({
  htmlFor,
  label,
  required = false,
  className = ''
}: {
  htmlFor: string
  label: string
  required?: boolean
  className?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-1 inline-flex items-center gap-1 pl-0.5 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    >
      <span>{label}</span>
      {required && <span className='text-destructive leading-none'>*</span>}
    </label>
  )
}
