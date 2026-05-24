'use client'

import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog.component'
import Button from '@/ui/button.component'
import type { TutorialSlideId } from '@shared/schemas/onboarding.schemas'
import { Gamepad, HumanArmsUp, Shield, Sword } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'

type Props = {
  slide: TutorialSlideId | null
  current: number
  total: number
  ctaLabel?: string
  onClose: () => void
}

const SlideIcon: Record<TutorialSlideId, React.ComponentType<{ className?: string }>> = {
  character: HumanArmsUp,
  mana: Gamepad,
  combat: Sword,
  gear: Shield
}

export default function TutorialDialog({ slide, current, total, ctaLabel, onClose }: Props) {
  const { t } = useTranslation()
  const open = slide !== null
  const Icon = slide ? SlideIcon[slide] : null
  const showDots = total > 1
  const label = ctaLabel ?? t('tutorial.done')

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-w-sm"
      >
        {showDots && (
          <div className="absolute right-4 top-4 flex gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`size-2 rounded-full transition-colors ${i === current ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        )}

        <DialogHeader className="items-center">
          {Icon && <Icon className="size-12 text-primary" />}
          <DialogTitle className="text-center text-xl">
            {slide ? t(`tutorial.${slide}.title`) : ''}
          </DialogTitle>
          <DialogDescription className="text-center">
            {slide ? t(`tutorial.${slide}.body`) : ''}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="justify-center sm:justify-center">
          <Button size="sm" onClick={onClose}>
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
