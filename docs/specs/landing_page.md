# Landing Page: Especificación Completa

Este documento combina la estructura visual, los elementos funcionales y el contenido de conversión de la landing page de Covenant.

---

## Bloque A: Hero Principal

**Estado:** ✅ Implementado

**Visual:** Layout de dos columnas en desktop (contenido izquierda, espacio visual derecha). Gradiente sutil de fondo. Logo "Covenant" como H1 con línea decorativa debajo.

**Elementos:**

- **Logo (H1):** "Covenant" con línea decorativa primaria
- **Titular (H2):** `landing.hero.title` - "Covenant transforma tu productividad en poder real."
- **Subtítulo:** `landing.hero.subtitle` - "Tu disciplina diaria forja tu leyenda divina."
- **Cuerpo:** `landing.hero.body` - Descripción de la app
- **CTA Primario:** `landing.hero.cta` - Botón enlazando a `/sign-up`

---

## Bloque B: Propuesta de Valor

**Estado:** ✅ Implementado

**Visual:** Sección centrada con fondo card/50. Texto centrado con ancho máximo de 3xl.

**Elementos:**

- **Titular (H2):** `landing.value_proposition.title` - "Covenant no es otra app de to-dos."
- **Cuerpo:** `landing.value_proposition.body` - Descripción del sistema de progreso persistente

---

## Bloque C: Productividad

**Estado:** ✅ Implementado

Agrupa las funcionalidades de gestión personal: tareas, hábitos y objetivos.

**Visual:** Grid de 3 columnas en desktop con Cards. Cada card tiene icono en contenedor con fondo primario/10.

**Iconos utilizados:** List, Repeat, Bullseye (de @nsmr/pixelart-react)

### Gestión de Tareas Completa

- **Icono:** List
- **Titular:** `landing.productivity.tasks.title`
- **Cuerpo:** `landing.productivity.tasks.body`

### Sistema de Hábitos

- **Icono:** Repeat
- **Titular:** `landing.productivity.habits.title`
- **Cuerpo:** `landing.productivity.habits.body`

### Áreas y Objetivos

- **Icono:** Bullseye
- **Titular:** `landing.productivity.goals.title`
- **Cuerpo:** `landing.productivity.goals.body`

---

## Bloque D: Tu Personaje

**Estado:** ✅ Implementado

Presenta la experiencia RPG personal: avatar, estadísticas y habilidades.

**Visual:** Fondo secondary/5. Grid de features (2 cols md, 3 cols lg) + grid de estadísticas (2 cols, 4 cols md).

**Iconos utilizados:** Sliders, BookOpen, User, Trophy, Zap, Heart, Shield (de @nsmr/pixelart-react)

### Estadísticas Vivas

- **Icono:** Sliders
- **Titular:** `landing.character.stats.title`
- **Cuerpo:** `landing.character.stats.body`

### Sistema de Doctrinas y Maná

- **Icono:** BookOpen
- **Titular:** `landing.character.doctrines.title`
- **Cuerpo:** `landing.character.doctrines.body`

### Clases con Identidad

- **Icono:** User
- **Titular:** `landing.character.classes.title`
- **Cuerpo:** `landing.character.classes.body`

### Grid de Estadísticas

Cards con iconos mostrando las 4 estadísticas:

- **STR** (Trophy)
- **MAG** (Zap)
- **HP** (Heart)
- **MP** (Shield)

---

## Bloque E: Sistema de Combate

**Estado:** ✅ Implementado

El loop de juego completo: dados → misiones → combate → recompensas.

**Visual:** Grid de 4 columnas (2 md, 4 lg) con Cards. Primera card con borde accent/30 para destacar el sistema de dados.

**Iconos utilizados:** Gamepad, Flag, Shield (de @nsmr/pixelart-react)

### Sistema de Dados

- **Icono:** Gamepad
- **Titular:** `landing.combat.dice.title`
- **Cuerpo:** `landing.combat.dice.body`

**Tabla de dados (dentro de la card):**

| Clave i18n                                      | Dados |
| ----------------------------------------------- | ----- |
| `landing.combat.dice.table.daily_habit`         | 2     |
| `landing.combat.dice.table.high_impact_task`    | 4     |
| `landing.combat.dice.table.completed_objective` | 6     |
| `landing.combat.dice.table.habit_streak`        | 5     |

### Misiones y Aventuras

- **Icono:** Flag
- **Titular:** `landing.combat.missions.title`
- **Cuerpo:** `landing.combat.missions.body`

### Combate Reactivo

- **Icono:** Gamepad
- **Titular:** `landing.combat.reactive.title`
- **Cuerpo:** `landing.combat.reactive.body`

### Equipamiento y Tienda

- **Icono:** Shield
- **Titular:** `landing.combat.equipment.title`
- **Cuerpo:** `landing.combat.equipment.body`

---

## Bloque F: Próximamente

**Estado:** ✅ Implementado

**Visual:** Fondo card/50. Grid de 2 columnas (sm) o 3 columnas (lg). Cada feature en card con icono y texto.

**Iconos utilizados:** BookOpen, Gamepad, Trophy, Users, Calendar, Zap (de @nsmr/pixelart-react)

| Feature      | Icono    | Claves i18n                                                   |
| ------------ | -------- | ------------------------------------------------------------- |
| Journaling   | BookOpen | `landing.coming_soon.features.journaling.title/description`   |
| PvP          | Gamepad  | `landing.coming_soon.features.pvp.title/description`          |
| Leaderboards | Trophy   | `landing.coming_soon.features.leaderboards.title/description` |
| Co-op        | Users    | `landing.coming_soon.features.coop.title/description`         |
| Seasonal     | Calendar | `landing.coming_soon.features.seasonal.title/description`     |
| Scaling      | Zap      | `landing.coming_soon.features.scaling.title/description`      |

---

## Bloque G: Cierre y CTA Final

**Estado:** ✅ Implementado

**Visual:** Fondo secondary/10. Texto centrado con ancho máximo de 3xl.

**Contenido:**

- **Línea 1:** `landing.closing.line1` - "Covenant no te empuja a hacer más."
- **Línea 2:** `landing.closing.line2` - "Te obliga a hacer lo que dices que importa." (destacado en primary)
- **Línea 3:** `landing.closing.line3` - Descripción de dados y tiradas
- **Línea 4:** `landing.closing.line4` - "Tu productividad tiene consecuencias. Hazlas contar."

**CTA Final:** `landing.closing.cta` - Botón enlazando a `/sign-up`

---

## Bloque H: Footer

**Estado:** ✅ Implementado (combinado con Bloque G en ClosingAndFooterSection)

**Visual:** Fondo card con borde superior. Contenido centrado.

**Elementos:**

- Logo "Covenant" en texto primario
- Separador decorativo
- Copyright dinámico con año actual

---

## Resumen de Estructura

| Bloque                | Componente                | Propósito                | CTAs       | Estado |
| --------------------- | ------------------------- | ------------------------ | ---------- | ------ |
| A. Hero               | `HeroSection`             | Captura de atención      | `/sign-up` | ✅     |
| B. Propuesta          | `ValuePropositionSection` | Diferenciación           | —          | ✅     |
| C. Productividad      | `ProductivitySection`     | Features de gestión      | —          | ✅     |
| D. Tu Personaje       | `CharacterSection`        | Experiencia RPG personal | —          | ✅     |
| E. Sistema de Combate | `CombatSection`           | Loop de juego            | —          | ✅     |
| F. Próximamente       | `ComingSoonSection`       | Roadmap / FOMO           | —          | ✅     |
| G. Cierre + H. Footer | `ClosingAndFooterSection` | Conversión final         | `/sign-up` | ✅     |

---

## Implementación Técnica

**Archivo:** `front/app/(landing)/page.tsx`

**Características:**

- Scroll snap vertical (`snap-y snap-mandatory`)
- Cada sección ocupa altura mínima de pantalla (`min-h-screen`)
- i18n vía `react-i18next` con hook `useTranslation()`
- Iconos de `@nsmr/pixelart-react`
- Componentes UI reutilizables: Button, Card, Separator

**Componentes importados:**
-react`

- Componentes UI reutilizables: Button, Card, Separator

**Componentes importados:**

```tsx
import Button from '@/components/ui/button.component'
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.component'
import Separator from '@/components/ui/separator.component'
```

---

> [!NOTE]
> Todos los elementos deben ser accesibles y cumplir con WCAG 2.1 AA. El sistema soporta `prefers-reduced-motion` para desactivar animaciones.
