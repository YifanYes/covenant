// Area of Effect patterns for tactical combat
// Each pattern is defined as an array of [dx, dy] offsets from the target position

export const AoEPatternType = {
  SINGLE: 'SINGLE',
  CROSS: 'CROSS',
  DIAMOND: 'DIAMOND',
  LINE_3: 'LINE_3',
  CONE: 'CONE',
  CIRCLE_2: 'CIRCLE_2'
} as const
export type AoEPatternType = (typeof AoEPatternType)[keyof typeof AoEPatternType]

// Pattern definitions as [dx, dy] offsets from target center
export const AOE_PATTERNS: Record<AoEPatternType, [number, number][]> = {
  // Single target (center only)
  SINGLE: [[0, 0]],

  // Cross/plus shape (5 tiles)
  CROSS: [
    [0, 0],   // Center
    [1, 0],   // Right
    [-1, 0],  // Left
    [0, 1],   // Down
    [0, -1]   // Up
  ],

  // Diamond shape (9 tiles, 3x3 rotated)
  DIAMOND: [
    [0, 0],   // Center
    [1, 0],   // Right
    [-1, 0],  // Left
    [0, 1],   // Down
    [0, -1],  // Up
    [1, 1],   // Down-right
    [1, -1],  // Up-right
    [-1, 1],  // Down-left
    [-1, -1]  // Up-left
  ],

  // Line of 3 tiles (horizontal, can be rotated based on direction)
  LINE_3: [
    [0, 0],   // Start
    [1, 0],   // Middle
    [2, 0]    // End
  ],

  // Cone spread (4 tiles, expanding from caster)
  CONE: [
    [1, 0],   // Front
    [2, 0],   // Far front
    [2, 1],   // Far front diagonal down
    [2, -1]   // Far front diagonal up
  ],

  // Circle with radius 2 (13 tiles)
  CIRCLE_2: [
    [0, 0],    // Center
    // Distance 1
    [1, 0], [-1, 0], [0, 1], [0, -1],
    // Distance 2
    [2, 0], [-2, 0], [0, 2], [0, -2],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ]
}

// Doctrine to AoE pattern mapping
export const DOCTRINE_AOE_PATTERNS: Record<string, AoEPatternType> = {
  // Templar - FORM
  igneous_cut: 'SINGLE',
  war_pyre: 'CROSS',           // Area fire DOT zone
  // Templar - VOID
  fan_cut: 'CROSS',            // Attacks up to 2 enemies in cross pattern
  disruption_storm: 'CROSS',   // Ultimate - 4 power dice split between enemies

  // Herald - VOID
  fireball: 'DIAMOND',         // 3 dice area + burning
  black_hole: 'CIRCLE_2',      // Ultimate - stun all enemies + 2 direct damage

  // Herald - FORM
  temporal_prison: 'DIAMOND',  // Ultimate - 5 dice area 3x3 + stun
  blinding_faith: 'SINGLE',   // +7 power single target + IMMOBILIZED

  // Single target doctrines (for completeness)
  truth_blade: 'SINGLE',
  entropic_acceleration: 'SINGLE',
  tidal_strike: 'SINGLE',
  unerring_dart: 'SINGLE',
  disintegration_ray: 'SINGLE',
  summary_execution: 'SINGLE',
  arcane_push: 'SINGLE',
  frost_bite: 'SINGLE',
  fragility_curse: 'SINGLE'
}

// Default casting range for doctrines (can be overridden per doctrine)
export const DEFAULT_DOCTRINE_RANGE = 3

// Doctrine-specific ranges
export const DOCTRINE_RANGES: Record<string, number> = {
  // Short range (melee)
  truth_blade: 1,
  igneous_cut: 1,
  entropic_acceleration: 1,
  tidal_strike: 1,
  fan_cut: 1,
  summary_execution: 1,
  ice_lance: 1,

  // Medium range
  war_pyre: 2,
  disruption_storm: 2,
  arcane_push: 3,
  fireball: 3,
  silence_vortex: 3,
  frost_bite: 3,

  // Long range
  unerring_dart: 4,
  temporal_prison: 4,
  blinding_faith: 4,
  fragility_curse: 4,
  inspiration: 4,
  black_hole: 4,
  disintegration_ray: 5
}

/**
 * Get tiles affected by an AoE pattern centered on a target position.
 * Filters out tiles outside grid bounds.
 */
export function getAoETiles(
  center: { x: number; y: number },
  pattern: AoEPatternType,
  gridWidth: number,
  gridHeight: number
): { x: number; y: number }[] {
  const offsets = AOE_PATTERNS[pattern]
  const tiles: { x: number; y: number }[] = []

  for (const [dx, dy] of offsets) {
    const x = center.x + dx
    const y = center.y + dy

    // Check bounds
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
      tiles.push({ x, y })
    }
  }

  return tiles
}

/**
 * Get tiles affected by an AoE pattern with rotation support.
 * For directional patterns (LINE_3, CONE), rotates based on caster-to-target direction.
 */
export function getAoETilesWithRotation(
  center: { x: number; y: number },
  casterPos: { x: number; y: number },
  pattern: AoEPatternType,
  gridWidth: number,
  gridHeight: number
): { x: number; y: number }[] {
  let offsets: [number, number][]

  // For directional patterns, rotate based on direction
  if (pattern === 'LINE_3') {
    offsets = getRotatedLinePattern(casterPos, center)
  } else if (pattern === 'CONE') {
    offsets = getRotatedConePattern(casterPos, center)
  } else {
    offsets = AOE_PATTERNS[pattern]
  }

  const tiles: { x: number; y: number }[] = []

  for (const [dx, dy] of offsets) {
    const x = center.x + dx
    const y = center.y + dy

    // Check bounds
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
      tiles.push({ x, y })
    }
  }

  return tiles
}

/**
 * Rotate a LINE_3 pattern based on the direction from caster to target.
 * Returns the rotated offsets.
 */
export function getRotatedLinePattern(
  casterPos: { x: number; y: number },
  targetPos: { x: number; y: number }
): [number, number][] {
  const dx = targetPos.x - casterPos.x
  const dy = targetPos.y - casterPos.y

  // Determine primary direction
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal line
    if (dx >= 0) {
      return [[0, 0], [1, 0], [2, 0]] // Right
    } else {
      return [[0, 0], [-1, 0], [-2, 0]] // Left
    }
  } else {
    // Vertical line
    if (dy >= 0) {
      return [[0, 0], [0, 1], [0, 2]] // Down
    } else {
      return [[0, 0], [0, -1], [0, -2]] // Up
    }
  }
}

/**
 * Rotate a CONE pattern based on the direction from caster to target.
 * Returns the rotated offsets.
 */
export function getRotatedConePattern(
  casterPos: { x: number; y: number },
  targetPos: { x: number; y: number }
): [number, number][] {
  const dx = targetPos.x - casterPos.x
  const dy = targetPos.y - casterPos.y

  // Determine primary direction
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      // Facing right
      return [[1, 0], [2, 0], [2, 1], [2, -1]]
    } else {
      // Facing left
      return [[-1, 0], [-2, 0], [-2, 1], [-2, -1]]
    }
  } else {
    if (dy >= 0) {
      // Facing down
      return [[0, 1], [0, 2], [1, 2], [-1, 2]]
    } else {
      // Facing up
      return [[0, -1], [0, -2], [1, -2], [-1, -2]]
    }
  }
}

/**
 * Get the AoE pattern for a doctrine.
 * Checks the doctrine definition first, then falls back to DOCTRINE_AOE_PATTERNS mapping.
 * Returns SINGLE if no pattern is defined anywhere.
 */
export function getDoctrineAoEPattern(doctrineId: string, doctrineDef?: { aoePattern?: AoEPatternType }): AoEPatternType {
  // Prefer the pattern from the doctrine definition itself
  if (doctrineDef?.aoePattern) {
    return doctrineDef.aoePattern
  }
  // Fall back to the mapping
  return DOCTRINE_AOE_PATTERNS[doctrineId] ?? 'SINGLE'
}

/**
 * Get the casting range for a doctrine.
 * Checks the doctrine definition first, then falls back to DOCTRINE_RANGES mapping.
 * Returns DEFAULT_DOCTRINE_RANGE if no specific range is defined anywhere.
 */
export function getDoctrineRange(doctrineId: string, doctrineDef?: { castRange?: number }): number {
  // Prefer the range from the doctrine definition itself
  if (doctrineDef?.castRange !== undefined) {
    return doctrineDef.castRange
  }
  // Fall back to the mapping
  return DOCTRINE_RANGES[doctrineId] ?? DEFAULT_DOCTRINE_RANGE
}
