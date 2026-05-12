import { describe, expect, it } from 'vitest'
import { parseTacticalState } from '@shared/types/tactical-combat.types'

const validUnit = (over: Partial<Record<string, unknown>> & { id: string }) => ({
  name: over.id,
  currentHealth: 40,
  maxHealth: 40,
  currentMana: 5,
  maxMana: 5,
  speed: 1,
  strengthAtk: 4,
  strengthDef: 4,
  magicAtk: 5,
  magicDef: 5,
  ...over
})

describe('parseTacticalState', () => {
  it('returns null for null / non-object input', () => {
    expect(parseTacticalState(null)).toBeNull()
    expect(parseTacticalState(undefined)).toBeNull()
    expect(parseTacticalState('not a state')).toBeNull()
  })

  it('returns null when required fields are missing', () => {
    expect(parseTacticalState({ not_a_combat_state: true })).toBeNull()
    expect(parseTacticalState({ units: [] })).toBeNull() // missing turnOrder, currentTurnIndex
  })

  it('parses a well-formed state', () => {
    const state = {
      units: [validUnit({ id: 'player-1' }), validUnit({ id: 'enemy-1', templateId: 'shadow_demon' })],
      turnOrder: ['player-1', 'enemy-1'],
      currentTurnIndex: 0
    }
    const parsed = parseTacticalState(state)
    expect(parsed).not.toBeNull()
    expect(parsed!.units).toHaveLength(2)
    expect(parsed!.turnOrder).toEqual(['player-1', 'enemy-1'])
  })

  it('strips legacy Phaser-grid fields from a real persisted state', () => {
    const legacy = {
      stateVersion: 4,
      mapTemplateId: 'default',
      gridWidth: 1,
      gridHeight: 1,
      tiles: [[{ position: { x: 0, y: 0 }, terrain: 'GRASS', occupantId: null, isWalkable: true }]],
      turnNumber: 1,
      units: [
        {
          ...validUnit({ id: 'player-1' }),
          templateId: 'player',
          position: { x: 0, y: 0 },
          hasMoved: false,
          hasActed: true
        },
        {
          ...validUnit({ id: 'enemy-1', templateId: 'shadow_demon' }),
          hasMoved: false,
          hasActed: false
        }
      ],
      turnOrder: ['player-1', 'enemy-1'],
      currentTurnIndex: 0
    }

    const parsed = parseTacticalState(legacy)
    expect(parsed).not.toBeNull()

    // Top-level legacy fields stripped.
    expect(parsed as unknown as { tiles?: unknown }).not.toHaveProperty('tiles')
    expect(parsed as unknown as { gridWidth?: unknown }).not.toHaveProperty('gridWidth')
    expect(parsed as unknown as { gridHeight?: unknown }).not.toHaveProperty('gridHeight')
    expect(parsed as unknown as { mapTemplateId?: unknown }).not.toHaveProperty('mapTemplateId')
    expect(parsed as unknown as { turnNumber?: unknown }).not.toHaveProperty('turnNumber')
    expect(parsed as unknown as { stateVersion?: unknown }).not.toHaveProperty('stateVersion')

    // Per-unit legacy fields stripped.
    const player = parsed!.units.find((u) => u.id === 'player-1')!
    expect(player as unknown as { hasMoved?: unknown }).not.toHaveProperty('hasMoved')
    expect(player as unknown as { hasActed?: unknown }).not.toHaveProperty('hasActed')
    expect(player as unknown as { position?: unknown }).not.toHaveProperty('position')
    // templateId is optional and preserved when present.
    expect(player.templateId).toBe('player')

    const enemy = parsed!.units.find((u) => u.id === 'enemy-1')!
    expect(enemy.templateId).toBe('shadow_demon')
  })

  it('preserves potionUsedThisTurn when present', () => {
    const state = {
      units: [validUnit({ id: 'player-1' })],
      turnOrder: ['player-1'],
      currentTurnIndex: 0,
      potionUsedThisTurn: true
    }
    expect(parseTacticalState(state)?.potionUsedThisTurn).toBe(true)
  })
})
