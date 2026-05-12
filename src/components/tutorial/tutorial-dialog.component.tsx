'use client'

import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog.component'
import Button from '@/ui/button.component'
import { Gamepad, Sword, Trophy, Shield } from 'pixelarticons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  open: boolean
  onComplete: () => void
}

const slides = ['mana', 'combat', 'tier', 'gear'] as const
type Slide = (typeof slides)[number]

const SlideIcon: Record<Slide, React.ComponentType<{ className?: string }>> = {
  mana: Gamepad,
  combat: Sword,
  tier: Trophy,
  gear: Shield
}

export default function TutorialDialog({ open, onComplete }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const isLast = step === slides.length - 1
  const slide = slides[step]
  const Icon = SlideIcon[slide]

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-w-sm"
      >
        <DialogHeader className="items-center">
          <Icon className="size-12 text-primary" />
          <DialogTitle className="text-center text-xl">{t(`tutorial.${slide}.title`)}</DialogTitle>
          <DialogDescription className="text-center">{t(`tutorial.${slide}.body`)}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-2">
          {slides.map((slide, i) => (
            <span
              key={slide}
              className={`size-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground">
            {t('tutorial.skip')}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                {t('tutorial.back')}
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={onComplete}>
                {t('tutorial.done')}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                {t('tutorial.next')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
