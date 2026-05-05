# Design System: Covenant

Covenant is a high-performance productivity infrastructure embedded in a dark fantasy setting. The system balances technical utility with a narrative of global conflict where each user's individual actions affect their faction's balance of power.

---

## 1. Style & Atmosphere

| Aspect         | Description                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| **Genre**      | Dark Fantasy                                                                     |
| **Atmosphere** | A divided world in constant conflict. The tone is solemn, mystical, and warlike. |

### Interface Duality

- **Productivity Area:** Utilitarian, clean, and efficient style. Prioritizes data management with a minimalist aesthetic integrated into the faction's color palette.
- **Game Area:** "Hi-Bit" art (16-bit pixel art) with modern lighting effects.

### Impact Metric

The user acts as a unit within a faction; their consistency contributes to global objectives on a shared war map.

---

## 2. Visual Identity

### 2.1 The Logo

The central symbol is the **Ark of the Covenant** in detailed pixel art. It represents the mystical artifact that serves as the turning point in the world's history. Displayed as a high-resolution static image with no dynamic effects.

### 2.2 Theming System

The system implements a **Light / Dark Mode** selector. In dark mode, faction color saturation is reduced by 20% to prevent halation and visual fatigue, ensuring a contrast ratio of **4.5:1** (WCAG 2.1).

---

## 3. Technical Color Palette by Faction

The chromatic strategy is based on **Eigengrau** (intrinsic grey), **Chiaroscuro** (light and shadow), and organic decomposing tones — using deep shadows and dramatic highlights to generate visual volume.

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

To maintain the retro-modern aesthetic without compromising usability, the following overrides apply on top of NES.css and Tailwind CSS:

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

| Element               | Font           | Description                                                              |
| --------------------- | -------------- | ------------------------------------------------------------------------ |
| **Headings (H1–H6)**  | Cinzel         | Classic serif for solemn titles and section names. 90% opacity.          |
| **Body & Task Lists** | EB Garamond    | High-legibility font with technical and academic aesthetic. 80% opacity. |
| **UI Labels**         | Press Start 2P | 8-bit style for RPG-specific elements (where applicable).                |
| **Disabled Elements** | —              | 40% opacity.                                                             |

---

## 6. Technical Implementation

### 6.1 Base Elements

| Aspect            | Implementation                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **Rendering**     | `image-rendering: pixelated;` applied globally in CSS to prevent blur on scaling.         |
| **Layout**        | Tailwind CSS for the responsive grid system.                                              |
| **Components**    | Customized NES.css base using `:root` variables to inject the selected faction's palette. |
| **Accessibility** | `prefers-reduced-motion` support that disables shake/vibration animations.                |

### 6.2 Ornamental Elements

| Element      | Description                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| **Dividers** | Instead of plain `<hr>` lines, use repeatable SVGs or sprites: rusted chains, thorny roots, or stone cracks. |
| **Loaders**  | A spinning religious symbol or a chalice filling with blood.                                                 |

---

## 7. Productivity UI Principles

Optimizes operational efficiency through human-oriented design that maintains thematic cohesion without visual distraction.

| Principle                    | Description                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minimalism & Integration** | Lists and calendars with generous negative space; surfaces use the faction's Surface/Card tone.                                                 |
| **Data Hierarchy**           | Critical elements are highlighted with the accent color; secondary information uses reduced opacity (60%) over the Bone White tone (`#c2b29a`). |
| **Pixel-Perfect Precision**  | Margins, padding, and component sizes must align to an 8px grid.                                                                                |
| **Technical Interactivity**  | Immediate feedback on task completion via clear state changes; DotGothic16 bitmap typography for maximum sharpness at small sizes.              |
