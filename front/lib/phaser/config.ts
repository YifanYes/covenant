// Phaser game configuration constants

// Isometric tile dimensions
export const TILE_WIDTH = 64
export const TILE_HEIGHT = 32

// Default grid size
export const DEFAULT_GRID_WIDTH = 12
export const DEFAULT_GRID_HEIGHT = 8

// Canvas dimensions
export const CANVAS_WIDTH = 1280
export const CANVAS_HEIGHT = 720

// Camera settings
export const CAMERA_ZOOM_MIN = 0.5
export const CAMERA_ZOOM_MAX = 2
export const CAMERA_ZOOM_DEFAULT = 2.8
export const CAMERA_ZOOM_STEP = 0.1

// Grid offset to center the isometric grid
export const GRID_OFFSET_X = CANVAS_WIDTH / 2
export const GRID_OFFSET_Y = 250

// Animation durations (ms)
export const ANIMATION_DURATION = {
  UNIT_MOVE: 300,
  UNIT_ATTACK: 200,
  TILE_HIGHLIGHT: 150
}

// Z-index layers for depth sorting
export const DEPTH_LAYERS = {
  GRID: 0,
  TILE_HIGHLIGHT: 1,
  UNIT_SHADOW: 2,
  UNIT: 3,
  UNIT_SELECTED: 4,
  EFFECTS: 5,
  UI: 6
}
