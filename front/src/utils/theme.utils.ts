import { colorOptions } from '@/types/constants.types'

export const getColorClasses = (
  color: string | null | undefined,
  defaultStyles: {
    bg: string
    text: string
  }
) => {
  const colorOption = colorOptions.find((colorOption) => colorOption.color === color)
  return {
    bg: colorOption?.styles ?? defaultStyles.bg,
    text: colorOption?.text ?? defaultStyles.text
  }
}
