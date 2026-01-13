import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface DiceResultProps {
  value: number
  isSuccess: boolean
  isCritical: boolean
  isRolling?: boolean
  className?: string
}

// Pip positions for each dice face (cx, cy in a 32x32 grid) - more spread out
const pipPositions: Record<number, [number, number][]> = {
  1: [[16, 16]],
  2: [
    [6, 6],
    [26, 26]
  ],
  3: [
    [6, 6],
    [16, 16],
    [26, 26]
  ],
  4: [
    [6, 6],
    [26, 6],
    [6, 26],
    [26, 26]
  ],
  5: [
    [6, 6],
    [26, 6],
    [16, 16],
    [6, 26],
    [26, 26]
  ],
  6: [
    [6, 6],
    [26, 6],
    [6, 16],
    [26, 16],
    [6, 26],
    [26, 26]
  ]
}

function DiceFace({ value, className }: { value: number; className?: string }) {
  const pips = pipPositions[value] || []

  return (
    <svg viewBox='0 0 32 32' className={cn('h-full w-full', className)} style={{ shapeRendering: 'crispEdges' }}>
      {/* Pips - square pixels for authentic 8-bit look */}
      {pips.map(([cx, cy], i) => (
        <rect key={i} x={cx - 3} y={cy - 3} width='6' height='6' className='fill-current' />
      ))}
    </svg>
  )
}

export default function DiceResult({ value, isSuccess, isCritical, isRolling, className }: DiceResultProps) {
  const [randomDelay] = useState(() => Math.random() * 0.3)
  const [rollingValue, setRollingValue] = useState(1)

  // Animate through dice faces when rolling
  useEffect(() => {
    if (!isRolling) return

    const interval = setInterval(() => {
      setRollingValue(Math.floor(Math.random() * 6) + 1)
    }, 120)

    return () => clearInterval(interval)
  }, [isRolling])

  // 8-bit style container with stepped pixel corners
  const pixelContainerStyle = {
    imageRendering: 'pixelated' as const,
    clipPath:
      'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)'
  }

  if (isRolling) {
    return (
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center p-1',
          'bg-muted/80 border-muted-foreground/30 border-3',
          className
        )}
        style={{ ...pixelContainerStyle, animationDelay: `${randomDelay}s` }}
      >
        <DiceFace value={rollingValue} />
      </div>
    )
  }

  const getOverlayClass = () => {
    if (isCritical) return 'dice-critical'
    if (isSuccess) return 'dice-success'
    return 'dice-fail'
  }

  const getBorderColor = () => {
    if (isCritical) return 'border-yellow-500 bg-yellow-500/10'
    if (isSuccess) return 'border-emerald-500 bg-emerald-500/10'
    return 'border-red-500/50 bg-red-500/5'
  }

  return (
    <div
      className={cn(
        'relative flex h-10 w-10 items-center justify-center border-3 p-1',
        'animate-in zoom-in-50 duration-300',
        getBorderColor(),
        getOverlayClass(),
        className
      )}
      style={pixelContainerStyle}
    >
      <DiceFace value={value} />
    </div>
  )
}
