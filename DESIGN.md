# Design System: Covenant

Covenant = high-performance productivity infra embedded in dark fantasy setting. Balances technical utility with narrative of global conflict where each user's actions affect faction's balance of power.

---

## 1. Style & Atmosphere

| Aspect         | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| **Genre**      | Dark Fantasy                                                             |
| **Atmosphere** | Divided world in constant conflict. Tone solemn, mystical, warlike.      |

### Interface Duality

- **Productivity Area:** Utilitarian, clean, efficient. Prioritizes data management with minimalist aesthetic integrated into faction's color palette.
- **Game Area:** "Hi-Bit" art (16-bit pixel art) with modern lighting effects.

### Impact Metric

User acts as unit within faction; consistency contributes to global objectives on shared war map.

---

## 2. Visual Identity

### 2.1 The Logo

Central symbol: **Ark of the Covenant** in detailed pixel art. Represents mystical artifact serving as turning point in world's history. Displayed as high-resolution static image, no dynamic effects.

### 2.2 Theming System

System implements **Light / Dark Mode** selector. In dark mode, faction color saturation reduced by 20% to prevent halation and visual fatigue, ensuring contrast ratio **4.5:1** (WCAG 2.1).

---

## 3. Technical Color Palette by Faction

Chromatic strategy based on **Eigengrau** (intrinsic grey), **Chiaroscuro** (light/shadow), and organic decomposing tones — deep shadows and dramatic highlights generate visual volume.

### 3.1 Global Semantic Colors

| Semantic | Color           | Hex       |
| -------- | --------------- | --------- |
| Success  | Oxidized Green  | `#387072` |
| Error    | Bruised Purple  | `#854d64` |
| Info     | Spectral Blue   | `#3f5b66` |
| Warning  | Sanctified Gold | `#b0a36a` |

### 3.2 Faction Color Matrix

#### Sacred Knights

| Mode  | Background | Surface/Card | Primary Text | Accent           |
| ----- | ---------- | ------------ | ------------ | ---------------- |
| Dark  | `#1c1a17`  | `#2d2b27`    | `#c2b29a`    | `#b0a36a` (Gold) |
| Light | `#edead9`  | `#ffffff`    | `#5a5444`    | `#8c7d4b`        |

#### The Legion

| Mode  | Background | Surface/Card | Primary Text | Accent             |
| ----- | ---------- | ------------ | ------------ | ------------------ |
| Dark  | `#0f0f13`  | `#1a1a21`    | `#c2b29a`    | `#8e76a1` (Purple) |
| Light | `#eae7ef`  | `#ffffff`    | `#4a3b54`    | `#4a3b54`          |

#### Alchemists' League

| Mode  | Background | Surface/Card | Primary Text | Accent           |
| ----- | ---------- | ------------ | ------------ | ---------------- |
| Dark  | `#121b21`  | `#1d2a33`    | `#c2b29a`    | `#3f5b66` (Cyan) |
| Light | `#e6edef`  | `#ffffff`    | `#2a414a`    | `#2a414a`        |

#### The Wandering Death

| Mode  | Background | Surface/Card | Primary Text | Accent          |
| ----- | ---------- | ------------ | ------------ | --------------- |
| Dark  | `#242525`  | `#333535`    | `#c2b29a`    | `#787a7a` (Ash) |
| Light | `#ebeded`  | `#ffffff`    | `#444545`    | `#555757`       |

#### Crimson Inquisition

| Mode  | Background | Surface/Card | Primary Text | Accent          |
| ----- | ---------- | ------------ | ------------ | --------------- |
| Dark  | `#211212`  | `#2d1a1a`    | `#c2b29a`    | `#bf6b70` (Red) |
| Light | `#ede6e6`  | `#ffffff`    | `#5a3c3c`    | `#8c4b50`       |

#### Blood Pact

| Mode  | Background | Surface/Card | Primary Text | Accent            |
| ----- | ---------- | ------------ | ------------ | ----------------- |
| Dark  | `#1e1b1b`  | `#2a2525`    | `#c2b29a`    | `#a83232` (Blood) |
| Light | `#eddada`  | `#ffffff`    | `#5c2a2a`    | `#8c1c1c`         |

---

## 4. CSS Implementation

Retro-modern aesthetic without compromising usability. Overrides apply on top of NES.css and Tailwind CSS:

```css
:root {
  /* Base typography */
  --font-base: 'DotGothic16', sans-serif;
  --font-header: 'Alkhemikal', serif;

  /* Dynamic colors (injected per active faction) */
  --nes-primary: #bf6b70;
  --nes-success: #387072;
  --nes-warning: #b0a36a;
  --nes-error: #854d64;
  --nes-bg: #0f0f13;
  --nes-text: #c2b29a;
}

/* Crisp pixel rendering */
html,
body,
img,
canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* Baroque borders via 9-slice scaling */
.nes-container.is-dark {
  border-image: url('border-baroque-9slice.png') 27 repeat;
  border-image-outset: 2px;
  background-color: var(--nes-bg);
}

/* Typographic hierarchy with opacity for accessibility */
h1,
h2 {
  font-family: var(--font-header);
  color: var(--nes-text);
  opacity: 0.87;
}

p,
li {
  font-family: var(--font-base);
  color: var(--nes-text);
  opacity: 0.6;
}
```

---

## 5. Typography & Visual Hierarchy

| Element               | Font           | Description                                                       |
| --------------------- | -------------- | ----------------------------------------------------------------- |
| **Headings (H1–H6)**  | Cinzel         | Classic serif for solemn titles and section names. 90% opacity.   |
| **Body & Task Lists** | EB Garamond    | High-legibility font, technical/academic aesthetic. 80% opacity.  |
| **UI Labels**         | Press Start 2P | 8-bit style for RPG-specific elements (where applicable).         |
| **Disabled Elements** | —              | 40% opacity.                                                      |

---

## 6. Technical Implementation

### 6.1 Base Elements

| Aspect            | Implementation                                                                       |
| ----------------- | ------------------------------------------------------------------------------------ |
| **Rendering**     | `image-rendering: pixelated;` applied globally in CSS to prevent blur on scaling.    |
| **Layout**        | Tailwind CSS for responsive grid system.                                             |
| **Components**    | Customized NES.css base using `:root` variables to inject selected faction's palette.|
| **Accessibility** | `prefers-reduced-motion` support disables shake/vibration animations.                |

### 6.2 Ornamental Elements

| Element      | Description                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| **Dividers** | Instead of plain `<hr>` lines, use repeatable SVGs or sprites: rusted chains, thorny roots, stone cracks.|
| **Loaders**  | Spinning religious symbol or chalice filling with blood.                                                 |

---

## 7. Productivity UI Principles

Optimizes operational efficiency via human-oriented design maintaining thematic cohesion without visual distraction.

| Principle                    | Description                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Minimalism & Integration** | Lists and calendars with generous negative space; surfaces use faction's Surface/Card tone.                                              |
| **Data Hierarchy**           | Critical elements highlighted with accent color; secondary info uses reduced opacity (60%) over Bone White tone (`#c2b29a`).             |
| **Pixel-Perfect Precision**  | Margins, padding, component sizes must align to 8px grid.                                                                                |
| **Technical Interactivity**  | Immediate feedback on task completion via clear state changes; DotGothic16 bitmap typography for max sharpness at small sizes.           |
