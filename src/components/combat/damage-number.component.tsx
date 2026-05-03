'use client'
import { cn } from '@/lib/cn.lib'
import { AnimatePresence, motion } from 'framer-motion'

interface DamageNumberProps {
  amount: number
  type: 'damage' | 'heal' | 'critical'
}

export default function DamageNumber({ amount, type }: DamageNumberProps) {
  const colorClass = type === 'heal' ? 'text-emerald-400' : type === 'critical' ? 'text-yellow-400' : 'text-red-400'

  const prefix = type === 'heal' ? '+' : '-'

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.8 }}
      animate={{ opacity: 0, y: -40, scale: 1.2 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={cn('pointer-events-none absolute text-2xl font-bold', colorClass)}
      style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
    >
      {prefix}
      {amount}
    </motion.div>
  )
}

interface DamageNumberContainerProps {
  numbers: { amount: number; type: 'damage' | 'heal' | 'critical'; targetId: string }[]
  targetId: string
}

export function DamageNumberContainer({ numbers, targetId }: DamageNumberContainerProps) {
  const filtered = numbers.filter((n) => n.targetId === targetId)

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ transform: 'scaleX(-1)' }}
    >
      <AnimatePresence>
        {filtered.map((n, i) => (
          <DamageNumber key={`${targetId}-${i}-${n.amount}`} amount={n.amount} type={n.type} />
        ))}
      </AnimatePresence>
    </div>
  )
}
