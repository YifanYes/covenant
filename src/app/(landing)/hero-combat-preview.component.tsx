'use client'

import { translateEnemyName } from '@/components/combat/translate-enemy-name.utils'
import { cn } from '@/lib/cn.lib'
import { EnemyType } from '@shared/constants/enemies.constants'
import { generateEnemyNameKeys } from '@shared/constants/enemy-names.constants'
import { getTaskMana, type TaskImpact } from '@shared/constants/rewards.constants'
import Image from 'next/image'
import { Check } from 'pixelarticons/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const ENEMY_SPRITE = '/assets/enemies/shadow_demon.png'

// "combustion" is an art-only asset — not in the ABILITIES catalog, so it has no real mana
// cost/power. Preview-local values tuned so 3 tasks (1+3+5=9 mana) charge exactly one cast.
const ABILITY_ID = 'combustion'
const ABILITY_SPRITE = `/assets/abilities/${ABILITY_ID}.png`
const ABILITY_COST = 8
const ENEMY_MAX_HP = 100
const ABILITY_DAMAGE = ENEMY_MAX_HP // one-shots the minion

// Real task mana rewards: LOW=1, MEDIUM=3, HIGH=5. 1+3+5=9 >= 8 cost -> three tasks charge one cast.
const TASK_DEFS: { key: string; impact: TaskImpact }[] = [
  { key: 'landing.hero.preview.task1', impact: 'LOW' },
  { key: 'landing.hero.preview.task2', impact: 'MEDIUM' },
  { key: 'landing.hero.preview.task3', impact: 'HIGH' }
]

// Loop cadence (ms) — deliberately slow/readable.
const TASK_MS = 1200
const CAST_DELAY_MS = 900
const HIT_MS = 450 // matches hero-shake/hero-flash keyframe duration
const CAST_DISPLAY_MS = 1400 // how long the ability name/icon stays on screen (>= 1200ms)
const DEATH_PAUSE_MS = 2500

// Deterministic first enemy so SSR and the first client render match (Math.random only runs in effects).
const INITIAL_ENEMY = { prefix: 'enemyNames.minion.prefix.0', suffix: 'enemyNames.minion.suffix.0' }

type EnemyKeys = { prefix: string; suffix: string }

export default function HeroCombatPreview() {
  const { t } = useTranslation()

  const [enemy, setEnemy] = useState<EnemyKeys>(INITIAL_ENEMY)
  const [completed, setCompleted] = useState(0) // tasks completed this cycle (0..3)
  const [mana, setMana] = useState(0) // accumulated mana (0..~9)
  const [enemyHp, setEnemyHp] = useState(ENEMY_MAX_HP)
  const [casting, setCasting] = useState(false)
  const [hit, setHit] = useState(false)
  const [dead, setDead] = useState(false)
  const [hitId, setHitId] = useState(0) // re-keys the damage number so its animation replays

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // A representative static frame for reduced-motion users — no timers, no loop.
    const applyStaticFrame = () => {
      setEnemy(generateEnemyNameKeys(EnemyType.MINION))
      setCompleted(2)
      setMana(getTaskMana('LOW') + getTaskMana('MEDIUM')) // 4 mana banked
      setEnemyHp(ENEMY_MAX_HP)
    }
    if (reduce) {
      applyStaticFrame()
      return
    }

    let cancelled = false
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const after = (ms: number, fn: () => void) => {
      const id = setTimeout(() => {
        timers.delete(id)
        if (!cancelled) fn()
      }, ms)
      timers.add(id)
    }

    // Local mirrors so the loop reads fresh values without re-running the effect.
    let tasksDone = 0
    let manaPool = 0
    let hp = ENEMY_MAX_HP

    const spawn = () => {
      setEnemy(generateEnemyNameKeys(EnemyType.MINION))
      setEnemyHp(ENEMY_MAX_HP)
      setMana(0)
      setCompleted(0)
      setDead(false)
      hp = ENEMY_MAX_HP
      manaPool = 0
      tasksDone = 0
      after(TASK_MS, completeTask)
    }

    const cast = () => {
      manaPool = Math.max(0, manaPool - ABILITY_COST) // spend the ability's real mana cost
      setMana(manaPool)
      setCasting(true)
      after(CAST_DISPLAY_MS, () => setCasting(false)) // keep the ability card on screen, independent of the hit
      after(150, () => {
        setHit(true)
        setHitId((n) => n + 1)
        hp = Math.max(0, hp - ABILITY_DAMAGE)
        setEnemyHp(hp)
        after(HIT_MS, () => setHit(false))
        if (hp <= 0) {
          setDead(true)
          after(DEATH_PAUSE_MS, spawn)
        } else {
          // Survived (won't happen with 100 power, but keep the loop honest): recharge.
          tasksDone = 0
          setCompleted(0)
          after(TASK_MS, completeTask)
        }
      })
    }

    const completeTask = () => {
      const def = TASK_DEFS[tasksDone]
      if (!def) return // all tasks already done this cycle; a cast is pending
      tasksDone += 1
      manaPool += getTaskMana(def.impact)
      setCompleted(tasksDone)
      setMana(manaPool)
      if (manaPool >= ABILITY_COST || tasksDone >= TASK_DEFS.length) {
        after(CAST_DELAY_MS, cast) // enough mana -> cast the ability
      } else {
        after(TASK_MS, completeTask)
      }
    }

    spawn()

    const onVisibility = () => {
      if (document.hidden) {
        timers.forEach(clearTimeout)
        timers.clear()
      } else if (!cancelled) {
        // Hiding clears every pending timer (including death->spawn), so the loop's
        // phase is lost. Restart a fresh cycle rather than blindly resuming mid-loop.
        spawn()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      timers.clear()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const enemyName = translateEnemyName(t, `${enemy.prefix}|${enemy.suffix}`)
  const manaShown = Math.min(mana, ABILITY_COST)

  return (
    <div className="relative flex w-[min(24rem,100%)] flex-col gap-5 p-6">
      {/* Enemy */}
      <div className="border-border bg-card/60 relative flex flex-col items-center gap-2.5 rounded-xl border-2 px-5 pb-5 pt-6">
        <span
          className={cn(
            'bg-destructive pointer-events-none absolute inset-0 rounded-xl opacity-0',
            hit && 'motion-safe:animate-hero-flash'
          )}
        />
        <div
          className={cn(
            'relative h-28 w-28',
            !dead && !hit && 'motion-safe:animate-hero-float',
            hit && !dead && 'motion-safe:animate-hero-shake',
            dead && 'motion-safe:animate-hero-die'
          )}
        >
          <Image
            src={ENEMY_SPRITE}
            alt={enemyName}
            fill
            sizes="112px"
            className="object-contain [image-rendering:pixelated]"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
        <span className="text-foreground text-center text-sm font-semibold">{enemyName}</span>

        {hit && (
          <span
            key={hitId}
            className="text-destructive pointer-events-none absolute left-1/2 top-6 text-xl font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] motion-safe:animate-hero-damage motion-reduce:hidden"
          >
            -{ABILITY_DAMAGE}
          </span>
        )}

        {/* Enemy HP */}
        <div className="mt-0.5 flex w-full items-center gap-2">
          <span className="text-muted-foreground w-11 text-[0.65rem] font-bold tracking-wider">
            {t('landing.hero.preview.hp_label')}
          </span>
          <div className="bg-muted/50 relative h-2.5 flex-1 overflow-hidden rounded-full">
            <span
              className="bg-destructive absolute inset-0 origin-left rounded-full transition-transform duration-700 ease-out"
              style={{ transform: `scaleX(${enemyHp / ENEMY_MAX_HP})` }}
            />
          </div>
        </div>
      </div>

      {/* Ability cast */}
      <div className="flex min-h-14 items-center justify-center">
        {casting && (
          <span className="text-primary border-primary/40 bg-primary/10 inline-flex items-center gap-3 rounded-lg border px-4 py-2 text-base font-bold tracking-wide motion-safe:animate-hero-cast-in">
            <Image
              src={ABILITY_SPRITE}
              alt=""
              width={40}
              height={40}
              className="[image-rendering:pixelated]"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            {t('landing.hero.preview.ability_name')}
          </span>
        )}
      </div>

      {/* Mana */}
      <div className="flex w-full items-center gap-2">
        <span className="text-muted-foreground w-11 text-[0.65rem] font-bold tracking-wider">
          {t('landing.hero.preview.mana_label')}
        </span>
        <div className="bg-muted/50 relative h-2.5 flex-1 overflow-hidden rounded-full">
          <span
            className="bg-primary absolute inset-0 origin-left rounded-full transition-transform duration-700 ease-out"
            style={{ transform: `scaleX(${manaShown / ABILITY_COST})` }}
          />
        </div>
        <span className="text-muted-foreground w-9 text-right text-[0.65rem] font-bold tabular-nums">
          {manaShown}/{ABILITY_COST}
        </span>
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-2">
        {TASK_DEFS.map((def, i) => {
          const done = i < completed
          return (
            <div
              key={def.key}
              className={cn(
                'border-border bg-card/80 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[0.8rem]',
                done ? 'border-primary/40 text-muted-foreground/70' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px]',
                  done ? 'border-primary text-primary' : 'border-muted-foreground'
                )}
              >
                {done && <Check className="h-3 w-3 motion-safe:animate-hero-pop" />}
              </span>
              <span className={cn(done && 'line-through')}>{t(def.key)}</span>
              <span
                className={cn('ml-auto text-[0.7rem] font-bold', done ? 'text-primary' : 'text-muted-foreground/60')}
              >
                +{getTaskMana(def.impact)}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-muted-foreground text-center text-[0.7rem] leading-snug">
        {t('landing.hero.preview.caption')}
      </p>
    </div>
  )
}
