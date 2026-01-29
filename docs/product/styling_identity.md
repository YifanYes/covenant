# Guía de estilo: Ecosistema ARQ

ARQ es una infraestructura de productividad de alto rendimiento integrada en un entorno de fantasía oscura. El sistema equilibra la utilidad técnica con una narrativa de conflicto global donde las acciones individuales de cada usuario afectan al equilibrio de poder de su facción.

---

## 1. Directrices de Estilo y Atmósfera

| Aspecto       | Descripción                                                                       |
| ------------- | --------------------------------------------------------------------------------- |
| **Género**    | Dark Fantasy (Fantasía Oscura)                                                    |
| **Atmósfera** | Un mundo dividido y en conflicto constante. El tono es solemne, místico y bélico. |

### Dualidad de Interfaz

- **Área de Productividad:** Estilo utilitario, limpio y eficiente. Prioriza la gestión de datos con una estética minimalista integrada en la paleta de la facción.
- **Área de Juego:** Arte "Hi-Bit" (pixel art de 16 bits) con efectos de iluminación modernos.

### Métrica de Impacto

El usuario actúa como una unidad dentro de una facción; su consistencia contribuye a objetivos globales en un mapa de guerra compartido.

---

## 2. Identidad Visual

### 2.1 El Logotipo

El símbolo central es el **Arca de la Alianza** en pixel art detallado. Representa el artefacto místico que sirve como punto de inflexión en la historia del mundo. Se presenta como una imagen estática de alta resolución sin efectos dinámicos.

### 2.2 Sistema de Tematización

El sistema implementa un selector de **Modo Claro / Modo Oscuro**. En el modo oscuro, la saturación de los colores de facción se reduce un 20% para evitar el efecto de halo y fatiga visual, asegurando un ratio de contraste de **4.5:1** (WCAG 2.1).

---

## 3. Paleta Técnica por Facción

La estrategia cromática se basa en el concepto de **Eigengrau** (gris intrínseco), **Chiaroscuro** (claroscuro) y tonos orgánicos en descomposición, utilizando sombras profundas y luces dramáticas para generar volumen.

### 3.1 Colores Semánticos Globales

| Semántica | Color             | Código    |
| --------- | ----------------- | --------- |
| Success   | Verde Oxidado     | `#387072` |
| Error     | Púrpura Magullado | `#854d64` |
| Info      | Azul Espectral    | `#3f5b66` |
| Warning   | Oro Santificado   | `#b0a36a` |

### 3.2 Matriz Cromática de Facciones

#### Caballeros Sagrados

| Modo   | Background | Surface/Card | Texto Primario | Acento           |
| ------ | ---------- | ------------ | -------------- | ---------------- |
| Oscuro | `#1c1a17`  | `#2d2b27`    | `#c2b29a`      | `#b0a36a` (Gold) |
| Claro  | `#edead9`  | `#ffffff`    | `#5a5444`      | `#8c7d4b`        |

#### La Legión

| Modo   | Background | Surface/Card | Texto Primario | Acento             |
| ------ | ---------- | ------------ | -------------- | ------------------ |
| Oscuro | `#0f0f13`  | `#1a1a21`    | `#c2b29a`      | `#8e76a1` (Purple) |
| Claro  | `#eae7ef`  | `#ffffff`    | `#4a3b54`      | `#4a3b54`          |

#### Liga de Alquimistas

| Modo   | Background | Surface/Card | Texto Primario | Acento           |
| ------ | ---------- | ------------ | -------------- | ---------------- |
| Oscuro | `#121b21`  | `#1d2a33`    | `#c2b29a`      | `#3f5b66` (Cyan) |
| Claro  | `#e6edef`  | `#ffffff`    | `#2a414a`      | `#2a414a`        |

#### La Muerte Errante

| Modo   | Background | Surface/Card | Texto Primario | Acento          |
| ------ | ---------- | ------------ | -------------- | --------------- |
| Oscuro | `#242525`  | `#333535`    | `#c2b29a`      | `#787a7a` (Ash) |
| Claro  | `#ebeded`  | `#ffffff`    | `#444545`      | `#555757`       |

#### Inquisición Carmesí

| Modo   | Background | Surface/Card | Texto Primario | Acento          |
| ------ | ---------- | ------------ | -------------- | --------------- |
| Oscuro | `#211212`  | `#2d1a1a`    | `#c2b29a`      | `#bf6b70` (Red) |
| Claro  | `#ede6e6`  | `#ffffff`    | `#5a3c3c`      | `#8c4b50`       |

#### Pacto de la Sangre

| Modo   | Background | Surface/Card | Texto Primario | Acento            |
| ------ | ---------- | ------------ | -------------- | ----------------- |
| Oscuro | `#1e1b1b`  | `#2a2525`    | `#c2b29a`      | `#a83232` (Blood) |
| Claro  | `#eddada`  | `#ffffff`    | `#5c2a2a`      | `#8c1c1c`         |

---

## 4. Implementación Técnica (CSS)

Para mantener la estética retro-moderna sin comprometer la usabilidad, se aplican los siguientes overrides sobre NES.css y Tailwind CSS:

```css
:root {
  /* Tipografía base */
  --font-base: 'DotGothic16', sans-serif;
  --font-header: 'Alkhemikal', serif;

  /* Colores dinámicos (inyectados según facción) */
  --nes-primary: #bf6b70;
  --nes-success: #387072;
  --nes-warning: #b0a36a;
  --nes-error: #854d64;
  --nes-bg: #0f0f13;
  --nes-text: #c2b29a;
}

/* Renderizado nítido de píxeles */
html,
body,
img,
canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* Bordes Barrocos mediante 9-slice scaling */
.nes-container.is-dark {
  border-image: url('border-baroque-9slice.png') 27 repeat;
  border-image-outset: 2px;
  background-color: var(--nes-bg);
}

/* Jerarquía tipográfica con opacidad para accesibilidad */
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

## 5. Tipografía y Jerarquía Visual

| Elemento                      | Fuente         | Descripción                                                                       |
| ----------------------------- | -------------- | --------------------------------------------------------------------------------- |
| **Encabezados (H1-H6)**       | Cinzel         | Fuente serif clásica para títulos solemnes y nombres de sección. 90% de opacidad. |
| **Cuerpo y Listas de Tareas** | EB Garamond    | Fuente de alta elegibilidad técnica y estética académica. Opacidad al 80%.        |
| **Etiquetas de Interfaz**     | Press Start 2P | Estilo 8 bits para elementos RPG específicos (si aplica).                         |
| **Elementos deshabilitados**  | —              | 40% de opacidad.                                                                  |

---

## 6. Implementación Técnica

### 6.1 Elementos Base

| Aspecto           | Implementación                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| **Renderizado**   | `image-rendering: pixelated;` global en CSS para evitar desenfoque en escalado.                       |
| **Estructura**    | Tailwind CSS para el sistema de rejilla responsiva.                                                   |
| **Componentes**   | Base de NES.css customizada con variables `:root` para inyectar la paleta de la facción seleccionada. |
| **Accesibilidad** | Soporte para `prefers-reduced-motion` que desactiva vibraciones.                                      |

### 6.2 Elementos Ornamentales

| Elemento      | Descripción                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Divisores** | En lugar de líneas `<hr>` simples, utilizar SVGs o sprites repetibles de cadenas oxidadas, raíces espinosas o grietas en la piedra. |
| **Loaders**   | Un símbolo religioso giratorio o un cáliz llenándose de sangre.                                                                     |

---

## 7. Productividad Visual

Optimiza la eficiencia operativa mediante un diseño orientado al humano que mantiene la cohesión temática sin distracciones visuales.

| Principio                     | Descripción                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minimalismo e Integración** | Listas y calendarios con abundante espacio negativo y superficies que utilizan el tono Surface/Card de la facción.                                          |
| **Jerarquía de Datos**        | Los elementos críticos se resaltan con el color de acento, mientras que la información secundaria utiliza opacidad reducida (60%) sobre el tono Bone White. |
| **Precisión "Pixel Perfect"** | Márgenes, rellenos y tamaños de componentes alineados obligatoriamente a una cuadrícula en múltiplos de 8px.                                                |
| **Interactividad Técnica**    | Feedback inmediato al completar tareas mediante cambios de estado claros y tipografía bitmap DotGothic16 para máxima nitidez en tamaños reducidos.          |
