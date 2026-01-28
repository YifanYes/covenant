// Area of Effect patterns for doctrines
// Each pattern is an array of [dx, dy] offsets from the target position

export const AOE_PATTERNS = {
  // Single target
  SINGLE: [[0, 0]],

  // + shape (cross)
  CROSS: [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ],

  // Diamond 3x3
  DIAMOND: [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ],

  // Line of 3 (horizontal, can be rotated)
  LINE_3: [
    [0, 0],
    [1, 0],
    [2, 0]
  ],

  // Cone spread
  CONE: [
    [1, 0],
    [2, 0],
    [2, 1],
    [2, -1]
  ],

  // Circle radius 2
  CIRCLE_2: [
    [0, 0],
    // Ring 1
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    // Ring 2
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ]
} as const

export type AoEPatternName = keyof typeof AOE_PATTERNS

// Doctrine to AoE mapping
export const DOCTRINE_AOE_PATTERNS: Record<string, AoEPatternName> = {
  igneousCut: 'SINGLE',
  fireball: 'DIAMOND',
  lightningBurst: 'LINE_3',
  blackHole: 'CIRCLE_2',
  disruptionStorm: 'CROSS'
}
