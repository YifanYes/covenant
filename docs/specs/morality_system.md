# Sistema de Moralidad - Especificación Técnica

## Resumen

El Sistema de Moralidad añade un atributo de alineamiento ético al personaje que registra sus decisiones narrativas. Este sistema influye en cómo el mundo reacciona al jugador y desbloquea caminos únicos de juego.

## Atributo de Moralidad

### Especificación Base

| Campo         | Valor                                 |
| ------------- | ------------------------------------- |
| Nombre        | `morality`                            |
| Tipo          | `Int`                                 |
| Rango         | 0 - 100                               |
| Valor Inicial | 50 (Neutral)                          |
| Ubicación     | Columna directa en modelo `Character` |

### Umbrales de Alineamiento

| Estado      | Rango    | Descripción                                                      |
| ----------- | -------- | ---------------------------------------------------------------- |
| **Santo**   | 75 - 100 | Personajes que consistentemente eligen el camino de la rectitud  |
| **Neutral** | 26 - 74  | La mayoría de personajes residen aquí, manteniendo un equilibrio |
| **Demonio** | 0 - 25   | Personajes corruptos, egoístas y viciosos                        |

## Cambios en Base de Datos

### Migración Prisma

```prisma
// server/prisma/schema.prisma
model Character {
  // ... campos existentes ...
  morality  Int  @default(50)  // Añadir después de magicNature
  // ... resto de campos ...
}
```

### Comando de Migración

```bash
cd server
npx prisma db push && npx prisma generate
```

## Cambios en Backend

### 1. Constantes Compartidas

**Archivo:** `shared/constants/morality.ts`

```typescript
export const MORALITY_THRESHOLDS = {
  SAINT: 75,
  DEMON: 25,
  MIN: 0,
  MAX: 100,
  DEFAULT: 50
} as const

export const MoralityStatus = {
  SAINT: 'SAINT',
  NEUTRAL: 'NEUTRAL',
  DEMON: 'DEMON'
} as const
export type MoralityStatus = (typeof MoralityStatus)[keyof typeof MoralityStatus]

export function getMoralityStatus(morality: number): MoralityStatus {
  if (morality >= MORALITY_THRESHOLDS.SAINT) return MoralityStatus.SAINT
  if (morality <= MORALITY_THRESHOLDS.DEMON) return MoralityStatus.DEMON
  return MoralityStatus.NEUTRAL
}

export function clampMorality(value: number): number {
  return Math.max(MORALITY_THRESHOLDS.MIN, Math.min(MORALITY_THRESHOLDS.MAX, value))
}
```

### 2. Tipos Compartidos

**Archivo:** `shared/types/morality.types.ts`

```typescript
import type { MoralityStatus } from '../constants/morality'

export interface MoralityChange {
  previousValue: number
  newValue: number
  previousStatus: MoralityStatus
  newStatus: MoralityStatus
  delta: number
  statusChanged: boolean
}
```

### 3. Character Repository

**Archivo:** `server/repositories/character.repository.ts`

Añadir métodos:

```typescript
async updateMorality(characterId: string, morality: number): Promise<Character> {
  return this.prisma.character.update({
    where: { id: characterId },
    data: { morality }
  })
}

async adjustMorality(characterId: string, delta: number): Promise<Character> {
  const character = await this.findByIdWithClassesOrThrow(characterId)
  const newMorality = clampMorality((character.morality ?? 50) + delta)
  return this.updateMorality(characterId, newMorality)
}
```

### 4. Morality Service

**Archivo:** `server/services/morality.service.ts`

```typescript
import { getMoralityStatus, clampMorality, MORALITY_THRESHOLDS } from '@shared/constants/morality'
import type { MoralityChange } from '@shared/types/morality.types'
import type { CharacterRepository } from '../repositories/character.repository'

export class MoralityService {
  constructor(private characterRepository: CharacterRepository) {}

  async getMorality(characterId: string) {
    const character = await this.characterRepository.findByIdWithClassesOrThrow(characterId)
    const morality = character.morality ?? 50
    return {
      morality,
      status: getMoralityStatus(morality)
    }
  }

  async adjustMorality(characterId: string, delta: number): Promise<MoralityChange> {
    const character = await this.characterRepository.findByIdWithClassesOrThrow(characterId)
    const previousValue = character.morality ?? 50
    const previousStatus = getMoralityStatus(previousValue)

    const newValue = clampMorality(previousValue + delta)
    const newStatus = getMoralityStatus(newValue)

    await this.characterRepository.updateMorality(characterId, newValue)

    return {
      previousValue,
      newValue,
      previousStatus,
      newStatus,
      delta: newValue - previousValue,
      statusChanged: previousStatus !== newStatus
    }
  }
}
```

### 5. Service Factory

**Archivo:** `server/services/service.factory.ts`

Añadir MoralityService al factory con el patrón de inicialización lazy existente.

## Integración con Sistema de Inversiones

### Actualizar InvestmentTemplate

**Archivo:** `shared/constants/investments.ts`

```typescript
export interface InvestmentTemplate {
  // ... campos existentes ...
  moralityImpact?: number // Cambio de moralidad por contribución
  successMoralityBonus?: number // Bonus al completar exitosamente
  failureMoralityPenalty?: number // Penalización si falla
}
```

### Valores de Impacto por Inversión

| Inversión               | moralityImpact | successMoralityBonus | Justificación                  |
| ----------------------- | -------------- | -------------------- | ------------------------------ |
| anti_demon_barrier      | +1             | +3                   | Acción defensiva y protectora  |
| providence_purification | +2             | +5                   | Acto de fe y purificación      |
| dark_heart_operation    | 0              | +2                   | Acción moralmente ambigua      |
| gen2_armament_program   | 0              | +1                   | Neutral - progreso tecnológico |

### Actualizar Investment Service

**Archivo:** `server/services/investment.service.ts`

En el método `contribute()`, después de registrar la contribución:

```typescript
// Aplicar impacto de moralidad si existe
const template = getInvestmentById(investment.investmentId)
if (template?.moralityImpact) {
  await this.moralityService.adjustMorality(character.id, template.moralityImpact)
}
```

## Cambios en Frontend

### 1. Componente MoralityBar

**Archivo:** `front/app/(workspace)/inventory/_components/morality-bar.component.tsx`

Barra visual con gradiente de color:

- Rojo (0-25): Zona Demonio
- Amarillo/Naranja (26-74): Zona Neutral
- Dorado/Blanco (75-100): Zona Santo

```tsx
'use client'

import { getMoralityStatus, MORALITY_THRESHOLDS } from '@shared/constants/morality'
import { useTranslation } from 'react-i18next'

interface MoralityBarProps {
  value: number
}

export default function MoralityBar({ value }: MoralityBarProps) {
  const { t } = useTranslation()
  const status = getMoralityStatus(value)

  const getColorClass = () => {
    if (value >= MORALITY_THRESHOLDS.SAINT) return 'bg-amber-400'
    if (value <= MORALITY_THRESHOLDS.DEMON) return 'bg-red-600'
    return 'bg-orange-400'
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span>{t(`morality.status.${status.toLowerCase()}`)}</span>
        <span>{value}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full transition-all ${getColorClass()}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
```

### 2. Componente MoralityBadge

**Archivo:** `front/app/(workspace)/inventory/_components/morality-badge.component.tsx`

Badge que muestra el estado actual con icono apropiado.

### 3. Integrar en Character Status

**Archivo:** `front/app/(workspace)/inventory/_components/character-status.component.tsx`

Añadir sección de moralidad después de los otros stats del personaje.

### 4. Mostrar en Inversiones

**Archivo:** `front/app/(workspace)/investments/page.tsx`

- Mostrar `+X moralidad` en el modal de contribución cuando la inversión tiene impacto
- Mostrar notificación toast después de contribuir si hubo cambio de moralidad

## Traducciones i18n

### Inglés (`front/public/locales/en/translation.json`)

```json
{
  "morality": {
    "title": "Morality",
    "status": {
      "saint": "Saint",
      "neutral": "Neutral",
      "demon": "Demon"
    },
    "change": {
      "increased": "+{{amount}} Morality",
      "decreased": "-{{amount}} Morality",
      "became_saint": "You have ascended to Sainthood!",
      "became_demon": "Darkness has consumed your soul...",
      "left_saint": "You have fallen from grace...",
      "left_demon": "A spark of light returns to your soul..."
    }
  }
}
```

### Español (`front/public/locales/es/translation.json`)

```json
{
  "morality": {
    "title": "Moralidad",
    "status": {
      "saint": "Santo",
      "neutral": "Neutral",
      "demon": "Demonio"
    },
    "change": {
      "increased": "+{{amount}} Moralidad",
      "decreased": "-{{amount}} Moralidad",
      "became_saint": "Has ascendido a la Santidad!",
      "became_demon": "La oscuridad ha consumido tu alma...",
      "left_saint": "Has caído en desgracia...",
      "left_demon": "Una chispa de luz regresa a tu alma..."
    }
  }
}
```

## Efectos Visuales por Estado

### Santo (75-100)

- Elementos de UI con resplandor dorado
- Título "Santo/a" junto al nombre
- Icono de halo o luz

### Demonio (0-25)

- Elementos de UI con acentos oscuros/rojos
- Título "Demonio" junto al nombre
- Icono de llamas o cuernos

### Neutral (26-74)

- UI estándar sin modificaciones especiales

## Mecánicas Futuras (Post-MVP)

Estas mecánicas se implementarán después del sistema base:

1. **Doctrinas Exclusivas**: Algunas doctrinas requieren estado Santo o Demonio
2. **Items de Tienda**: Equipamiento exclusivo por alineamiento
3. **Actividades Exclusivas**: Misiones solo para Santos o solo para Demonios
4. **Ramas Narrativas**: Diferentes outcomes de historia basados en moralidad
5. **Decisiones de Historia**: Sistema dedicado de decisiones narrativas que afectan moralidad

## Archivos a Modificar

| Archivo                                                                      | Cambio                                 |
| ---------------------------------------------------------------------------- | -------------------------------------- |
| `server/prisma/schema.prisma`                                                | Añadir campo `morality` a Character    |
| `shared/constants/morality.ts`                                               | Nuevo archivo con constantes           |
| `shared/types/morality.types.ts`                                             | Nuevo archivo con tipos                |
| `shared/constants/investments.ts`                                            | Añadir campos de impacto moral         |
| `server/repositories/character.repository.ts`                                | Métodos updateMorality, adjustMorality |
| `server/services/morality.service.ts`                                        | Nuevo servicio                         |
| `server/services/service.factory.ts`                                         | Registrar MoralityService              |
| `server/services/investment.service.ts`                                      | Integrar cambios de moralidad          |
| `front/app/(workspace)/inventory/_components/morality-bar.component.tsx`     | Nuevo componente                       |
| `front/app/(workspace)/inventory/_components/morality-badge.component.tsx`   | Nuevo componente                       |
| `front/app/(workspace)/inventory/_components/character-status.component.tsx` | Integrar moralidad                     |
| `front/public/locales/en/translation.json`                                   | Claves de moralidad                    |
| `front/public/locales/es/translation.json`                                   | Claves de moralidad                    |

## Verificación

### Tests Manuales

1. Crear personaje nuevo → verificar morality = 50
2. Contribuir a inversión con moralityImpact → verificar cambio
3. Verificar UI muestra estado correcto (Santo/Neutral/Demonio)
4. Cruzar umbral 75 → verificar notificación "ascendido a Santo"
5. Cruzar umbral 25 → verificar notificación "demonio"

### Tests Unitarios

- `MoralityService.adjustMorality()` - clamp correcto en límites
- `getMoralityStatus()` - retorna estado correcto por valor
- `clampMorality()` - no excede 0-100
