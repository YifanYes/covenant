#!/usr/bin/env node
/**
 * Generate pixel-art quest scene backdrops.
 *
 * Authored panoramic (512x144 ≈ 3.55:1) to survive the wide combat-arena container
 * without losing the mid-band action area to object-cover cropping. Rasterized at
 * base resolution, then nearest-neighbor upscaled 4× to 2048x576 for crisp pixels.
 *
 * Layout convention per scene:
 *   y 0–46    sky / vault ceiling
 *   y 46–104  mid-distance scenery (gate, ships, arch)
 *   y 104–144 foreground ground band — battle platforms sit here under sprites
 *
 * Output: public/assets/scenes/<questId>.png
 * Run: node scripts/generate-quest-scenes.mjs
 */

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const sharp = require(resolve(__dirname, '..', 'node_modules', '.pnpm', 'sharp@0.34.5', 'node_modules', 'sharp'))

const OUT_DIR = resolve(__dirname, '..', 'public', 'assets', 'scenes')
const BASE_W = 512
const BASE_H = 144
const SCALE = 4

// Player + enemy platform anchors (match combat-arena 12-col grid: player col 1–5, enemy col 8–13).
const PLAYER_PLATFORM_X = 120
const ENEMY_PLATFORM_X = 392
const PLATFORM_Y = 122

mkdirSync(OUT_DIR, { recursive: true })

// ---------- Pixel-drawing helpers ----------

const px = (x, y, w, h, fill) =>
  `<rect x="${x | 0}" y="${y | 0}" width="${w | 0}" height="${h | 0}" fill="${fill}"/>`

function dots(seed, count, xRange, yRange, palette, opacity = 1) {
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = (xRange[0] + rand() * (xRange[1] - xRange[0])) | 0
    const y = (yRange[0] + rand() * (yRange[1] - yRange[0])) | 0
    const c = palette[(rand() * palette.length) | 0]
    out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}" opacity="${opacity}"/>`
  }
  return out
}

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${BASE_W}" height="${BASE_H}" viewBox="0 0 ${BASE_W} ${BASE_H}" shape-rendering="crispEdges">${body}</svg>`

/** Pokemon-style elliptical battle platform — small ground disc with shadow ring. */
function platform(cx, cy, w, palette) {
  const [edge, base, hi] = palette
  let out = ''
  // outer ellipse via stacked horizontal rects
  const layers = [
    [0, w, 1, edge],
    [-1, w + 2, 1, edge], // shadow flange
    [1, w - 2, 1, base],
    [2, w - 4, 1, hi]
  ]
  for (const [dx, lw, dy, c] of layers) {
    out += px(cx - (w >> 1) + dx, cy + dy, lw, 1, c)
  }
  // soft cast shadow below
  out += `<rect x="${cx - (w >> 1) - 2}" y="${cy + 2}" width="${w + 4}" height="2" fill="#000" opacity="0.35"/>`
  return out
}

function brickWall(x, y, w, h, mortar, brick, brickHi, brickLo) {
  let out = px(x, y, w, h, mortar)
  const rowH = 4
  const brickW = 8
  for (let row = 0; row * rowH < h; row++) {
    const rowY = y + row * rowH
    const offset = row % 2 === 0 ? 0 : brickW / 2
    for (let col = 0; col * brickW < w + brickW; col++) {
      const bx = x + col * brickW + offset
      if (bx >= x + w) continue
      const bw = Math.min(brickW - 1, x + w - bx)
      if (bw <= 0) continue
      out += px(bx, rowY, bw, rowH - 1, brick)
      out += px(bx, rowY, bw, 1, brickHi)
      out += px(bx, rowY + rowH - 2, bw, 1, brickLo)
    }
  }
  return out
}

function plankFloor(x, y, w, h, plank, plankDark, plankLight) {
  let out = px(x, y, w, h, plank)
  for (let py = y; py < y + h; py += 5) {
    out += px(x, py, w, 1, plankLight)
    out += px(x, py + 4, w, 1, plankDark)
    for (let nx = x + 7; nx < x + w; nx += 14) {
      out += px(nx, py + 1, 1, 1, plankDark)
    }
  }
  return out
}

function cobbleFloor(x, y, w, h, base, dark, light) {
  let out = px(x, y, w, h, base)
  for (let cy = y; cy < y + h; cy += 4) {
    for (let cx = x; cx < x + w; cx += 6) {
      const offset = ((cy - y) / 4) % 2 === 0 ? 0 : 3
      const tx = cx + offset
      if (tx >= x + w - 1) continue
      out += px(tx, cy, 5, 3, base)
      out += px(tx, cy, 5, 1, light)
      out += px(tx, cy + 2, 5, 1, dark)
      out += px(tx + 4, cy, 1, 3, dark)
    }
  }
  return out
}

function torch(x, y) {
  let out = ''
  out += px(x, y + 4, 3, 6, '#3b2516')
  out += px(x - 1, y, 5, 4, '#3b2516')
  out += px(x, y, 3, 1, '#1a0e05')
  out += px(x, y - 5, 3, 5, '#fbbf24')
  out += px(x + 1, y - 7, 1, 2, '#fde047')
  out += px(x, y - 3, 1, 3, '#f97316')
  out += px(x + 2, y - 3, 1, 3, '#f97316')
  out += px(x - 1, y - 1, 1, 2, '#ea580c')
  out += px(x + 3, y - 1, 1, 2, '#ea580c')
  out += `<rect x="${x - 6}" y="${y - 8}" width="15" height="16" fill="#fbbf24" opacity="0.18"/>`
  return out
}

// ---------- Scenes (panoramic 512x144) ----------

/** Patrol the North Gate — night city. Muted, desaturated palette so sprites pop. */
function patrolNorthGate() {
  let s = ''

  // Base fill so any uncovered region reads as deep night, not transparent.
  s += px(0, 0, BASE_W, BASE_H, '#0a0815')

  // Sky strip — only the top sliver. Wall covers the rest so sprites don't float.
  s += px(0, 0, BASE_W, 14, '#0a0815')
  s += px(0, 14, BASE_W, 8, '#15122a')

  // A few stars in the visible sky strip
  s += dots(11, 30, [0, BASE_W], [0, 18], ['#9ca3af', '#cbd5e1', '#e5e7eb'], 0.7)

  // Moon over right tower
  s += px(420, 4, 10, 10, '#e5e7eb')
  s += px(418, 6, 2, 6, '#cbd5e1')
  s += px(430, 6, 2, 6, '#cbd5e1')
  s += `<rect x="414" y="0" width="20" height="18" fill="#e5e7eb" opacity="0.12"/>`

  // Distant battlement profile (silhouette skyline behind front wall)
  for (let i = 0; i < 43; i++) {
    const x = i * 12
    const tall = (i * 7) % 3 === 0
    const top = tall ? 16 : 18
    s += px(x, top, 8, 6, '#0c0a18')
    s += px(x, top, 8, 1, '#1a153a')
    // dim window
    if ((i * 5) % 4 === 0) s += px(x + 2, top + 2, 2, 1, '#a16207')
  }

  // Front wall — covers entire width below sky, top edge with crenellations
  // Crenellation row
  for (let i = 0; i < BASE_W / 8; i++) {
    if (i % 2 === 0) {
      s += px(i * 8, 22, 8, 6, '#2a2535')
      s += px(i * 8, 22, 8, 1, '#3a3448')
      s += px(i * 8 + 7, 22, 1, 6, '#15121f')
    }
  }
  // Main wall body
  s += brickWall(0, 28, BASE_W, 80, '#0e0c18', '#2a2535', '#3a3448', '#15121f')

  // Watchtowers — left + right (taller, with conical caps)
  const tower = (tx) => {
    let out = ''
    // shaft
    out += brickWall(tx, 14, 40, 94, '#0e0c18', '#352a45', '#453a55', '#1a1424')
    // crenellation cap
    for (let i = 0; i < 5; i++) {
      out += px(tx + i * 8, 8, 8, 6, '#352a45')
      out += px(tx + i * 8, 8, 8, 1, '#453a55')
    }
    // arrow slits
    out += px(tx + 12, 30, 2, 8, '#070510')
    out += px(tx + 26, 30, 2, 8, '#070510')
    out += px(tx + 12, 52, 2, 8, '#070510')
    out += px(tx + 26, 52, 2, 8, '#070510')
    // banner
    out += px(tx + 18, 0, 2, 12, '#3b2516')
    out += px(tx + 14, 4, 8, 6, '#7a1f1f')
    out += px(tx + 14, 10, 2, 2, '#7a1f1f')
    out += px(tx + 20, 10, 2, 2, '#7a1f1f')
    return out
  }
  s += tower(40)   // left tower (behind player zone)
  s += tower(432)  // right tower (behind enemy zone)

  // Central gate — between the two towers
  const gx = 234
  s += px(gx, 30, 44, 78, '#070510')
  s += px(gx, 30, 44, 2, '#1a1424')
  // stepped arch corners
  s += px(gx - 2, 34, 2, 6, '#352a45')
  s += px(gx + 44, 34, 2, 6, '#352a45')
  // doors
  s += px(gx + 2, 34, 20, 70, '#241810')
  s += px(gx + 22, 34, 20, 70, '#241810')
  s += px(gx + 2, 34, 40, 1, '#3b2516')
  s += px(gx + 21, 34, 2, 70, '#0a0608')
  // door planks
  for (let i = 38; i < 104; i += 8) {
    s += px(gx + 2, i, 40, 1, '#1a0e05')
  }
  // hinges
  s += px(gx + 4, 40, 3, 2, '#a16207')
  s += px(gx + 4, 60, 3, 2, '#a16207')
  s += px(gx + 4, 80, 3, 2, '#a16207')
  s += px(gx + 36, 40, 3, 2, '#a16207')
  s += px(gx + 36, 60, 3, 2, '#a16207')
  s += px(gx + 36, 80, 3, 2, '#a16207')

  // Wall sconces between towers and gate (decoration in the mid-band)
  s += torch(160, 60)
  s += torch(340, 60)
  s += `<rect x="146" y="44" width="32" height="32" fill="#fbbf24" opacity="0.12"/>`
  s += `<rect x="326" y="44" width="32" height="32" fill="#fbbf24" opacity="0.12"/>`

  // Ground band — cobble
  s += cobbleFloor(0, 108, BASE_W, 36, '#1c1828', '#0e0b18', '#2a253a')

  // Battle platforms
  s += platform(PLAYER_PLATFORM_X, PLATFORM_Y, 60, ['#0a0815', '#2a253a', '#3a3448'])
  s += platform(ENEMY_PLATFORM_X, PLATFORM_Y, 60, ['#0a0815', '#2a253a', '#3a3448'])

  return svg(s)
}

/** Assault the Harbor — wide coastal dock at dusk, muted ocean. */
function assaultTheHarbor() {
  let s = ''

  // Base fill — base water tone so any gap reads sea-ish.
  s += px(0, 0, BASE_W, BASE_H, '#1c1a3a')

  // Sky strip — only the top sliver visible above warehouses.
  s += px(0, 0, BASE_W, 6, '#1c1a3a')
  s += px(0, 6, BASE_W, 6, '#3a2a55')
  s += px(0, 12, BASE_W, 6, '#7a3a1a')
  s += px(0, 18, BASE_W, 4, '#a04a14')

  // Left warehouse — covers player zone wall, tall structure
  const warehouse = (x, w, roofColor, wallColor, wallHi, wallLo) => {
    let out = ''
    // pitched roof
    for (let i = 0; i < 14; i++) {
      out += px(x + i, 14 - i, w - i * 2, 1, roofColor)
    }
    out += px(x, 14, w, 4, '#1a0e05')
    // body
    out += px(x, 18, w, 86, wallColor)
    // plank vertical lines
    for (let i = 0; i < w; i += 8) {
      out += px(x + i, 18, 1, 86, wallLo)
      out += px(x + i + 1, 18, 1, 86, wallHi)
    }
    // door
    const dx = x + (w >> 1) - 6
    out += px(dx, 70, 12, 34, '#1a0e05')
    out += px(dx + 1, 72, 10, 30, '#2a1809')
    out += px(dx + 5, 72, 1, 30, '#1a0e05')
    // windows (lit)
    out += px(x + 6, 30, 8, 8, '#1a0e05')
    out += px(x + 7, 31, 6, 6, '#e8a23a')
    out += px(x + 10, 31, 1, 6, '#1a0e05')
    out += px(x + 7, 34, 6, 1, '#1a0e05')
    out += px(x + w - 14, 30, 8, 8, '#1a0e05')
    out += px(x + w - 13, 31, 6, 6, '#e8a23a')
    out += px(x + w - 10, 31, 1, 6, '#1a0e05')
    out += px(x + w - 13, 34, 6, 1, '#1a0e05')
    // beam horizontal
    out += px(x, 50, w, 2, '#1a0e05')
    // sign
    out += px(x + (w >> 1) - 10, 56, 20, 6, '#3b2516')
    out += px(x + (w >> 1) - 10, 56, 20, 1, '#6b4a28')
    return out
  }
  s += warehouse(0, 110, '#5a2c10', '#5b3a1d', '#7c5a3a', '#2a1809')
  s += warehouse(402, 110, '#5a2c10', '#5b3a1d', '#7c5a3a', '#2a1809')

  // Center: open harbor view between warehouses
  // Sun
  const sx = 256
  s += px(sx - 8, 26, 16, 12, '#e8a23a')
  s += px(sx - 10, 28, 2, 8, '#e8a23a')
  s += px(sx + 8, 28, 2, 8, '#e8a23a')
  s += px(sx - 6, 24, 12, 2, '#f3c14a')
  s += `<rect x="${sx - 18}" y="20" width="36" height="22" fill="#e8a23a" opacity="0.15"/>`
  // Distant coast on horizon (only in center gap)
  s += px(112, 40, 290, 2, '#15101a')
  s += px(150, 38, 8, 4, '#15101a')
  s += px(310, 38, 6, 4, '#15101a')

  // Sea — between warehouses
  s += px(110, 42, 292, 62, '#1f3148')
  s += px(110, 42, 292, 1, '#3a5468')
  // sun reflection
  for (let y = 42; y < 90; y += 2) {
    const w = 4 + ((y - 42) >> 1)
    const x = sx - (w >> 1)
    const c = y < 56 ? '#d4943a' : y < 72 ? '#a04a14' : '#5a2c10'
    s += px(x, y, w, 1, c)
  }
  s += dots(4, 80, [110, 402], [44, 102], ['#3a5468', '#2a4258'], 0.5)

  // Ship in center distance
  s += px(196, 60, 36, 6, '#0a0608')
  s += px(192, 64, 44, 4, '#0a0608')
  s += px(214, 36, 1, 24, '#1a0e05')
  s += px(200, 38, 12, 22, '#1a1424')
  s += px(218, 38, 12, 22, '#1a1424')
  s += px(214, 32, 2, 4, '#7a1f1f') // flag
  // Smaller ship
  s += px(300, 70, 26, 4, '#0a0608')
  s += px(310, 56, 1, 14, '#1a0e05')
  s += px(304, 58, 12, 12, '#1a1424')

  // Dock planks — foreground ground band
  s += plankFloor(0, 104, BASE_W, 40, '#4a3018', '#1a0e05', '#6b4a28')
  s += px(0, 102, BASE_W, 2, '#0a0608')

  // Wall-mounted lanterns on each warehouse facing center
  const lantern = (x) => {
    let out = ''
    out += px(x, 66, 4, 6, '#1a0e05')
    out += px(x + 1, 67, 2, 4, '#e8a23a')
    out += px(x, 70, 4, 1, '#3b2516')
    out += `<rect x="${x - 6}" y="60" width="16" height="18" fill="#e8a23a" opacity="0.20"/>`
    return out
  }
  s += lantern(102)
  s += lantern(406)

  // Crate stack on dock between sprites and warehouses
  s += px(140, 84, 18, 20, '#4a3018')
  s += px(140, 84, 18, 1, '#6b4a28')
  s += px(140, 103, 18, 1, '#1a0e05')
  s += px(148, 84, 1, 20, '#1a0e05')
  s += px(140, 92, 18, 1, '#1a0e05')
  // Barrel
  s += px(354, 86, 14, 18, '#5a3a1d')
  s += px(354, 86, 14, 1, '#7c5a3a')
  s += px(354, 90, 14, 1, '#1a0e05')
  s += px(354, 99, 14, 1, '#1a0e05')
  s += px(354, 103, 14, 1, '#1a0e05')

  // Battle platforms — wooden discs
  s += platform(PLAYER_PLATFORM_X, PLATFORM_Y, 60, ['#1a0e05', '#3b2516', '#6b4a28'])
  s += platform(ENEMY_PLATFORM_X, PLATFORM_Y, 60, ['#1a0e05', '#3b2516', '#6b4a28'])

  return svg(s)
}

/** Defend the Southern Wall — catacomb interior, wide pan. */
function defendTheSouthernWall() {
  let s = ''

  // Vault background
  s += px(0, 0, BASE_W, BASE_H, '#0a0608')

  // Side brick walls extending full height
  s += brickWall(0, 8, 110, 100, '#0a0608', '#2a1818', '#3a2020', '#15080a')
  s += brickWall(402, 8, 110, 100, '#0a0608', '#2a1818', '#3a2020', '#15080a')
  // Back wall flanks of arch
  s += brickWall(110, 8, 130, 100, '#0a0608', '#2a1818', '#3a2020', '#15080a')
  s += brickWall(272, 8, 130, 100, '#0a0608', '#2a1818', '#3a2020', '#15080a')

  // Central arch with deep red glow
  const ax = 240
  s += px(ax, 44, 32, 64, '#070406')
  s += px(ax + 4, 44, 24, 62, '#1a0a0a')
  s += px(ax + 8, 48, 16, 56, '#5a1515')
  s += px(ax + 10, 54, 12, 48, '#8a1f1f')
  s += px(ax + 12, 60, 8, 40, '#b91c1c')
  s += `<rect x="${ax - 8}" y="36" width="48" height="72" fill="#ef4444" opacity="0.18"/>`

  // Arch keystone frame
  for (let i = 0; i < 16; i++) {
    s += px(ax, 44 + i * 4, 4, 4, '#5a3a3a')
    s += px(ax, 44 + i * 4, 4, 1, '#7a5050')
    s += px(ax, 47 + i * 4, 4, 1, '#2a1414')
    s += px(ax + 28, 44 + i * 4, 4, 4, '#5a3a3a')
    s += px(ax + 28, 44 + i * 4, 4, 1, '#7a5050')
    s += px(ax + 28, 47 + i * 4, 4, 1, '#2a1414')
  }
  for (let i = 0; i < 7; i++) {
    s += px(ax + 4 + i * 4, 40, 4, 4, '#5a3a3a')
    s += px(ax + 4 + i * 4, 40, 4, 1, '#7a5050')
    s += px(ax + 4 + i * 4, 43, 4, 1, '#2a1414')
  }

  // Torches on side walls (positioned behind/above sprite stand zones to backlight)
  s += torch(60, 52)
  s += torch(452, 52)
  s += `<rect x="40" y="34" width="44" height="48" fill="#fbbf24" opacity="0.10"/>`
  s += `<rect x="432" y="34" width="44" height="48" fill="#fbbf24" opacity="0.10"/>`

  // Cobwebs upper corners
  s += px(2, 12, 6, 1, '#9ca3af')
  s += px(2, 12, 1, 6, '#9ca3af')
  s += px(4, 14, 2, 1, '#9ca3af')
  s += px(BASE_W - 8, 12, 6, 1, '#9ca3af')
  s += px(BASE_W - 3, 12, 1, 6, '#9ca3af')

  // Skull decoration on left wall, between platforms (not under sprite)
  const skullX = 200
  s += px(skullX, 86, 6, 5, '#cbd5e1')
  s += px(skullX, 86, 6, 1, '#9ca3af')
  s += px(skullX + 1, 88, 1, 1, '#0a0608')
  s += px(skullX + 4, 88, 1, 1, '#0a0608')
  s += px(skullX + 1, 91, 4, 1, '#9ca3af')
  s += px(skullX + 1, 91, 1, 1, '#cbd5e1')
  s += px(skullX + 3, 91, 1, 1, '#cbd5e1')

  // Floor — stone slabs
  s += px(0, 108, BASE_W, 36, '#1a1212')
  for (let y = 112; y < 144; y += 6) {
    s += px(0, y, BASE_W, 1, '#0a0608')
    s += px(0, y + 1, BASE_W, 1, '#2a1c1c')
  }
  // Vertical seams
  for (let i = 0; i < 24; i++) {
    const offset = ((Math.floor((112 - 108) / 6) % 2) * 12) + i * 24
    s += px(offset, 108, 1, 36, '#0a0608')
  }

  // Red arch floor glow
  s += `<rect x="200" y="108" width="112" height="36" fill="#ef4444" opacity="0.20"/>`
  // Torch floor glow
  s += `<rect x="40" y="108" width="44" height="22" fill="#fbbf24" opacity="0.14"/>`
  s += `<rect x="432" y="108" width="44" height="22" fill="#fbbf24" opacity="0.14"/>`

  // Battle platforms — stone discs
  s += platform(PLAYER_PLATFORM_X, PLATFORM_Y, 60, ['#0a0608', '#3a2424', '#5a3a3a'])
  s += platform(ENEMY_PLATFORM_X, PLATFORM_Y, 60, ['#0a0608', '#3a2424', '#5a3a3a'])

  // Bones scattered (not on platforms)
  s += px(310, 132, 10, 2, '#cbd5e1')
  s += px(310, 131, 2, 1, '#cbd5e1')
  s += px(318, 131, 2, 1, '#cbd5e1')

  return svg(s)
}

// ---------- Render pipeline ----------

const scenes = [
  ['patrol_north_gate', patrolNorthGate()],
  ['assault_the_harbor', assaultTheHarbor()],
  ['defend_the_southern_wall', defendTheSouthernWall()]
]

for (const [id, svgStr] of scenes) {
  const out = resolve(OUT_DIR, `${id}.png`)
  const baseBuf = await sharp(Buffer.from(svgStr), { density: 72 })
    .resize(BASE_W, BASE_H, { fit: 'fill' })
    .png()
    .toBuffer()
  await sharp(baseBuf)
    .resize(BASE_W * SCALE, BASE_H * SCALE, { kernel: 'nearest' })
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log('wrote', out)
}
