'use client'

import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Phaser
const TacticalCombatView = dynamic(
  () => import('@/components/tactical/tactical-combat-view.component'),
  { ssr: false }
)

export default function TacticalTestPage() {
  return (
    <div className="h-screen w-full">
      <TacticalCombatView className="h-full" />
    </div>
  )
}
