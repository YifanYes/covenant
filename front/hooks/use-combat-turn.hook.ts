'use client'

import { useState } from 'react'

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
  // "Submitted" means sent to parent/backend but waiting for response
  const [submittedAttackRolls, setSubmittedAttackRolls] = useState<number[] | undefined>()
  const [submittedDefenseRolls, setSubmittedDefenseRolls] = useState<number[] | undefined>()

  // Roll both attack and defense dice at once
  const handleRoll = () => {
    const attackCount = Math.min(diceBank, weaponDice)
    const defenseCount = Math.min(diceBank, armorDice)
    const attackRolls = Array.from({ length: attackCount }, () => Math.floor(Math.random() * 6) + 1)
    const defenseRolls = Array.from({ length: defenseCount }, () => Math.floor(Math.random() * 6) + 1)

    setSubmittedAttackRolls(attackRolls)
    setSubmittedDefenseRolls(defenseRolls)

    onAttack({ attackRolls, defenseRolls })
  }

  // Clear results when user proceeds to next turn
  const clearResults = () => {
    setSubmittedAttackRolls(undefined)
    setSubmittedDefenseRolls(undefined)
  }

  // Calculate dice counts for display
  const attackDiceCount = Math.min(diceBank, weaponDice)
  const defenseDiceCount = Math.min(diceBank, armorDice)

  const isWaitingForResolve = isAttacking
  const showResults = !!(lastTurnResult && !isAttacking)

  return {
    submittedAttackRolls,
    submittedDefenseRolls,
    attackDiceCount,
    defenseDiceCount,
    isWaitingForResolve,
    showResults,
    handleRoll,
    clearResults
  }
}
