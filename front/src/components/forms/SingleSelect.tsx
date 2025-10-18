import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const SingleSelect = ({
  placeholder,
  options,
  onChange,
  value
}: {
  placeholder?: string
  options: { value: string; label: string }[]
  onChange: (date: string | null) => void
  value?: string
}) => (
  <Select onValueChange={onChange} value={value}>
    <SelectTrigger className='w-full'>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

export default SingleSelect
