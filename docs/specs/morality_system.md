# Sistema de Moralidad - Especificacion Tecnica

## Resumen

El Sistema de Moralidad anade un atributo de alineamiento etico por clase de personaje que registra sus decisiones narrativas. Este sistema influye en como el mundo reacciona al jugador y desbloquea caminos unicos de juego.

## Atributo de Moralidad

### Especificacion Base

| Campo         | Valor                                              |
| ------------- | -------------------------------------------------- |
| Nombre        | `morality`                                         |
| Tipo          | `Int`                                              |
| Rango         | 0 - 100                                            |
| Valor Inicial | 50 (Neutral)                                       |
| Ubicacion     | Columna en modelo `CharacterClass` (por clase)     |

### Umbrales de Alineamiento

| Estado      | Rango    | Descripcion                                                      |
| ----------- | -------- | ---------------------------------------------------------------- |
| **Santo**   | 75 - 100 | Personajes que consistentemente eligen el camino de la rectitud  |
| **Neutral** | 26 - 74  | La mayoria de personajes residen aqui, manteniendo un equilibrio |
| **Demonio** | 0 - 25   | Personajes corruptos, egoistas y viciosos                        |

## Cambios en Base de Datos

### Migracion Prisma

```prisma
// server/prisma/schema.prisma
model CharacterClass {
  // ... campos existentes hasta maxMana ...
  morality          Int       @default(50)
  equippedDoctrines String[]  @default([])
  // ... resto de campos ...
}
```

### Comando de Migracion

```bash
cd server
npx prisma db push && npx prisma generate
```

## Cambios en Tipos Compartidos

### 1. Constantes de Moralidad

**Archivo:** `shared/constants/morality.ts` (nuevo)

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

### 2. Tipos de Moralidad

**Archivo:** `shared/types/morality.types.ts` (nuevo)

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

### 3. Actualizar CharacterClassType

**Archivo:** `shared/types/character.types.ts`

Anadir `morality` al tipo `CharacterClassType`:

```typescript
export interface CharacterClassType {
  // ... campos existentes ...
  morality: number
  // ...
}
```

### 4. Actualizar InventoryCharacterClass

**Archivo:** `shared/types/gamification.types.ts`

Anadir `morality` al tipo `InventoryCharacterClass`:

```typescript
export interface InventoryCharacterClass {
  // ... campos existentes ...
  morality: number
  // ...
}
```

## Cambios en Backend

### 1. Character Repository

**Archivo:** `server/repositories/character.repository.ts`

Anadir un solo metodo. Actualiza morality en `CharacterClass` por `classId`. La logica de clamping vive en el servicio, no en el repositorio:

```typescript
async updateMorality(classId: string, morality: number): Promise<void> {
  await this.prisma.characterClass.update({
    where: { id: classId },
    data: { morality }
  })
}
```

### 2. Character Service

**Archivo:** `server/services/character.service.ts`

La logica de moralidad vive directamente en `CharacterService` (no en un servicio separado), ya que solo depende de `CharacterRepository`:

```typescript
import { clampMorality, getMoralityStatus } from '@shared/constants/morality'
import type { MoralityChange } from '@shared/types/morality.types'

// En el metodo getCurrentClass, incluir morality en el mapeo de clases:
classes: character.classes.map((c) => ({
  // ... campos existentes ...
  morality: c.morality,
  // ...
}))

// Nuevo metodo:
async adjustMorality(characterId: string, delta: number): Promise<MoralityChange> {
  const character = await this.characterRepository.findByIdWithClassesOrThrow(characterId)
  const currentClass = character.classes.find((c) => c.className === character.currentClass)
  if (!currentClass) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Current class not found for character ${characterId}`
    })
  }

  const previousValue = currentClass.morality
  const previousStatus = getMoralityStatus(previousValue)

  const newValue = clampMorality(previousValue + delta)
  const newStatus = getMoralityStatus(newValue)

  await this.characterRepository.updateMorality(currentClass.id, newValue)

  return {
    previousValue,
    newValue,
    previousStatus,
    newStatus,
    delta: newValue - previousValue,
    statusChanged: previousStatus !== newStatus
  }
}
```

### 3. Service Factory

**Archivo:** `server/services/service.factory.ts`

`InvestmentService` sube a Layer 2 al depender de `CharacterService`:

```typescript
get investment(): InvestmentService {
  return (this._investmentService ??= new InvestmentService(
    this.investmentRepository,
    this.characterRepository,
    this.character
  ))
}
```

## Integracion con Sistema de Inversiones

### Actualizar InvestmentTemplate

**Archivo:** `shared/constants/investments.ts`

Anadir campo requerido de impacto moral por contribucion:

```typescript
export interface InvestmentTemplate {
  // ... campos existentes ...
  moralityImpact: number // Cambio de moralidad por contribucion (0 = sin cambio)
}
```

### Valores de Impacto por Inversion

| Inversion               | moralityImpact | Justificacion                  |
| ----------------------- | -------------- | ------------------------------ |
| anti_demon_barrier      | +20            | Accion defensiva y protectora  |
| providence_purification | +20            | Acto de fe y purificacion      |
| dark_heart_operation    | +20            | Accion moralmente ambigua      |
| gen2_armament_program   | +20            | Neutral - progreso tecnologico |

### Actualizar Investment Service

**Archivo:** `server/services/investment.service.ts`

Anadir `CharacterService` como dependencia via constructor:

```typescript
export class InvestmentService {
  constructor(
    private investmentRepository: InvestmentRepository,
    private characterRepository: CharacterRepository,
    private characterService: CharacterService
  ) {}
```

En el metodo `contribute()`, despues de `this.investmentRepository.contribute(...)`:

```typescript
// Aplicar impacto de moralidad si existe
let moralityDelta: number | undefined
const template = getInvestmentById(investment.investmentId)
if (template && template.moralityImpact !== 0) {
  const change = await this.characterService.adjustMorality(characterId, template.moralityImpact)
  moralityDelta = change.delta
}
```

Actualizar `ContributeResult` en `shared/types/investment.types.ts`:

```typescript
export interface ContributeResult {
  success: boolean
  newTotal: number
  characterGold: number
  investmentCompleted: boolean
  moralityDelta?: number // Cambio de moralidad aplicado
}
```

## Cambios en Frontend

### 1. Componente MoralityBar

**Archivo:** `front/app/(workspace)/inventory/_components/morality-bar.component.tsx` (nuevo)

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

### 2. Integrar en Character Status

**Archivo:** `front/app/(workspace)/inventory/_components/character-status.component.tsx`

Anadir `MoralityBar` despues de la seccion de Dice Bank, antes de `CharacterDeathOverlay`:

```tsx
import MoralityBar from './morality-bar.component'

// Dentro del CardContent, despues del bloque de dice bank:
<Separator className="bg-sidebar-border my-1 w-auto" />
<MoralityBar value={character.morality} />
```

### 3. Mostrar en Inversiones

**Archivo:** `front/app/(workspace)/investments/page.tsx`

- Mostrar `+X moralidad` en el modal de contribucion cuando la inversion tiene `moralityImpact`
- Mostrar notificacion toast despues de contribuir si `result.moralityDelta` existe

## Traducciones i18n

### Ingles (`front/public/locales/en/translation.json`)

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

### Espanol (`front/public/locales/es/translation.json`)

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
      "left_saint": "Has caido en desgracia...",
      "left_demon": "Una chispa de luz regresa a tu alma..."
    }
  }
}
```

## Mecanicas Futuras (Post-MVP)

Estas mecanicas se implementaran despues del sistema base:

1. **Bonus por Completion de Inversiones**: `successMoralityBonus` / `failureMoralityPenalty` al completarse una inversion (requiere cambios en DeadlineService)
2. **Diferenciacion de Impacto Moral**: Valores distintos de `moralityImpact` por inversion segun su naturaleza narrativa
3. **Doctrinas Exclusivas**: Algunas doctrinas requieren estado Santo o Demonio
4. **Items de Tienda**: Equipamiento exclusivo por alineamiento
5. **Actividades Exclusivas**: Misiones solo para Santos o solo para Demonios
6. **Ramas Narrativas**: Diferentes outcomes de historia basados en moralidad
7. **Decisiones de Historia**: Sistema dedicado de decisiones narrativas que afectan moralidad
8. **Efectos Visuales por Estado**: Resplandor dorado para Santos, acentos rojos para Demonios, titulos junto al nombre

## Archivos Modificados

| Archivo                                                                      | Cambio                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| `server/prisma/schema.prisma`                                                | Anadir campo `morality` a CharacterClass                  |
| `shared/constants/morality.ts`                                               | Nuevo archivo con constantes y helpers                    |
| `shared/types/morality.types.ts`                                             | Nuevo archivo con tipo MoralityChange                     |
| `shared/types/character.types.ts`                                            | Anadir `morality` a CharacterClassType                    |
| `shared/types/gamification.types.ts`                                         | Anadir `morality` a InventoryCharacterClass               |
| `shared/types/investment.types.ts`                                           | Anadir `moralityDelta` a ContributeResult                 |
| `shared/constants/investments.ts`                                            | Anadir `moralityImpact` a InvestmentTemplate              |
| `server/repositories/character.repository.ts`                                | Metodo updateMorality (por classId)                       |
| `server/services/character.service.ts`                                       | Metodo adjustMorality + morality en getCurrentClass       |
| `server/services/service.factory.ts`                                         | InvestmentService sube a Layer 2 (depende de character)   |
| `server/services/investment.service.ts`                                      | Anadir CharacterService dep, aplicar en contribute        |
| `front/app/(workspace)/inventory/_components/morality-bar.component.tsx`     | Nuevo componente                                          |
| `front/app/(workspace)/inventory/_components/character-status.component.tsx` | Integrar MoralityBar                                      |
| `front/app/(workspace)/investments/page.tsx`                                 | Mostrar impacto moral y toast                             |
| `front/public/locales/en/translation.json`                                   | Claves de morality                                        |
| `front/public/locales/es/translation.json`                                   | Claves de moralidad                                       |

## Verificacion

### Tests Unitarios

En `server/__tests__/services/character.service.test.ts`:

- `CharacterService.adjustMorality()` — clamp correcto en limites 0 y 100
- `CharacterService.adjustMorality()` — detecta cambio de status al cruzar umbrales
- `CharacterService.adjustMorality()` — delta calculado correctamente tras clamping
- `getMoralityStatus()` — retorna estado correcto por valor
- `clampMorality()` — no excede 0-100

### Tests Manuales

1. Crear personaje nuevo → verificar morality = 50
2. Contribuir a inversion con moralityImpact → verificar cambio
3. Verificar UI muestra estado correcto (Santo/Neutral/Demonio)
4. Cruzar umbral 75 → verificar notificacion "ascendido a Santo"
5. Cruzar umbral 25 → verificar notificacion "demonio"
