import { useEffect, useState } from 'react'

interface UseCombatTurnProps {
  isAttacking: boolean
  diceBank: number
  weaponDice: number
  armorDice: number
  onAttack: (rolls: { attackRolls: number[]; defenseRolls: number[] }) => void
  lastTurnResult: any
}

export function useCombatTurn({
  isAttacking,
  diceBank,
  weaponDice,
  armorDice,
  onAttack,
  lastTurnResult
}: UseCombatTurnProps) {
  const [pendingAttackRolls, setPendingAttackRolls] = useState<number[] | undefined>()
  const [pendingDefenseRolls, setPendingDefenseRolls] = useState<number[] | undefined>()

  // "Submitted" means sent to parent/backend but waiting for response
  const [submittedAttackRolls, setSubmittedAttackRolls] = useState<number[] | undefined>()
  const [submittedDefenseRolls, setSubmittedDefenseRolls] = useState<number[] | undefined>()

  // Clear submitted rolls when we get a result
  useEffect(() => {
    if (lastTurnResult) {
      // Small timeout to allow UI to transition smoothly if needed,
      // or immediate clear if we want instant result display
      const timer = setTimeout(() => {
        setSubmittedAttackRolls(undefined)
        setSubmittedDefenseRolls(undefined)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [lastTurnResult])

  const handleRoll = (count: number) => {
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)

    if (!pendingAttackRolls) {
      // New turn start
      setSubmittedAttackRolls(undefined)
      setSubmittedDefenseRolls(undefined)
      setPendingAttackRolls(rolls)
    } else {
      // Defense roll (Second phase) - Trigger attack immediately
      const attackRolls = pendingAttackRolls
      const defenseRolls = rolls

      setPendingAttackRolls(undefined)
      setPendingDefenseRolls(undefined)

      setSubmittedAttackRolls(attackRolls)
      setSubmittedDefenseRolls(defenseRolls)

      onAttack({ attackRolls, defenseRolls })
    }
  }

  // Derived state
  const currentAvailableDice = (() => {
    let usedDice = 0
    if (pendingAttackRolls) usedDice += pendingAttackRolls.length
    if (pendingDefenseRolls) usedDice += pendingDefenseRolls.length
    return Math.max(0, diceBank - usedDice)
  })()

  // Determine what phase we are in for UI button label / limitation
  const isAttackPhase = !pendingAttackRolls
  const diceLimit = Math.min(diceBank, isAttackPhase ? weaponDice : armorDice)

  const isWaitingForResolve = !!(pendingAttackRolls && pendingDefenseRolls) || isAttacking
  const showResults = !!(lastTurnResult && !isAttacking && !pendingAttackRolls && !pendingDefenseRolls)

  return {
    pendingAttackRolls,
    pendingDefenseRolls,
    submittedAttackRolls,
    submittedDefenseRolls,
    currentAvailableDice,
    diceLimit,
    isAttackPhase,
    isWaitingForResolve,
    showResults,
    handleRoll
  }
}
