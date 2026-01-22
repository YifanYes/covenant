# Consumables and Doctrines Implementation

Implement two new game systems based on the lore documents:

1. **Consumables**: Health and Mana potions (from Economia.md)
2. **Doctrines**: Class-specific abilities with various effects (from Clases.md)

> [!IMPORTANT]
> Implement **Phase 1 (Consumables)** first as a standalone feature, then proceed with **Phases 2 (Doctrines)** in a separate iteration.

---

## Phase 1: Consumables System

### Shared Types

#### [MODIFY] [gamification.types.ts](file:///Users/yifan/Projects/arq/shared/types/gamification.types.ts)

Add `CONSUMABLE` to `ItemType`:

```typescript
export const ItemType = {
  // ... existing types
  CONSUMABLE: 'CONSUMABLE'
} as const
```

---

#### [MODIFY] [items.ts](file:///Users/yifan/Projects/arq/shared/constants/items.ts)

Add consumable interface and use `Record` for faster lookups:

```typescript
export interface ConsumableEffect {
  healHealth?: number
  healMana?: number
}

export interface ConsumableDefinition extends ItemDefinition {
  effect: ConsumableEffect
  stackable: boolean
}

// Use Record for O(1) lookups
export const CONSUMABLES: Record<string, ConsumableDefinition> = {
  health_potion: {
    id: 'health_potion',
    name: 'items.health_potion.name',
    description: 'items.health_potion.description',
    type: ItemType.CONSUMABLE,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {},
    price: 25,
    effect: { healHealth: 3 },
    stackable: true
  },
  mana_potion: {
    id: 'mana_potion',
    name: 'items.mana_potion.name',
    description: 'items.mana_potion.description',
    type: ItemType.CONSUMABLE,
    tier: 1,
    rarity: ItemRarity.COMMON,
    stats: {},
    price: 25,
    effect: { healMana: 3 },
    stackable: true
  }
}

export function getConsumableById(id: string): ConsumableDefinition | undefined {
  return CONSUMABLES[id]
}
```

---

### Backend Services

#### [MODIFY] [combat.service.ts](file:///Users/yifan/Projects/arq/server/services/combat.service.ts)

Add consumable logic to existing combat service:

- `useConsumable(userId: string, consumableId: string)`: Validates consumable exists in inventory, applies effects (heal health/mana), removes one from inventory

---

#### [MODIFY] [character.service.ts](file:///Users/yifan/Projects/arq/server/services/character.service.ts)

Add helper methods for consumable inventory management:

- Support quantity tracking for stackable items
- `removeFromInventory(itemId, quantity)` method
- Consumables already returned via `getCurrentClass` query

---

### tRPC Routes

#### [MODIFY] [character.router.ts](file:///Users/yifan/Projects/arq/server/routers/character.router.ts)

Add mutation:

- `character.useConsumable`: Use a consumable from inventory

---

### Translations

#### [MODIFY] [es/translation.json](file:///Users/yifan/Projects/arq/front/public/locales/es/translation.json)

```json
"items": {
  "health_potion": {
    "name": "Poción de Salud",
    "description": "Restaura 3 Vidas."
  },
  "mana_potion": {
    "name": "Poción de Maná",
    "description": "Restaura 3 de Maná."
  }
},
"consumables": {
  "use": "Usar",
  "success": "¡Consumible usado!",
  "error": "Error al usar el consumible"
}
```

#### [MODIFY] [en/translation.json](file:///Users/yifan/Projects/arq/front/public/locales/en/translation.json)

```json
"items": {
  "health_potion": {
    "name": "Health Potion",
    "description": "Restores 3 Health."
  },
  "mana_potion": {
    "name": "Mana Potion",
    "description": "Restores 3 Mana."
  }
},
"consumables": {
  "use": "Use",
  "success": "Consumable used!",
  "error": "Failed to use consumable"
}
```

---

### Frontend

#### [MODIFY] Combat Arena Component

- Add consumable "Use" buttons in combat arena UI
- Show available potions with quantities
- Handle use action with loading state and feedback

#### [MODIFY] Store Page

Add consumables to the store catalog for purchase.

---

## Phase 2: Doctrine System

### Shared Types

#### [NEW] [doctrine.types.ts](file:///Users/yifan/Projects/arq/shared/types/doctrine.types.ts)

```typescript
import { CharacterClassName, MagicNature } from '../constants/classes'

export const DoctrineEffectType = {
  POWER_MODIFIER: 'POWER_MODIFIER',
  THRESHOLD_MODIFIER: 'THRESHOLD_MODIFIER',
  GUARANTEED_CRITICAL: 'GUARANTEED_CRITICAL',
  NEGATE_HITS: 'NEGATE_HITS',
  APPLY_STATUS: 'APPLY_STATUS',
  HEAL: 'HEAL',
  DIRECT_DAMAGE: 'DIRECT_DAMAGE'
} as const

export const StatusEffect = {
  STUNNED: 'STUNNED',
  IMMOBILIZED: 'IMMOBILIZED',
  BURNING: 'BURNING',
  PURIFIED: 'PURIFIED',
  POISONED: 'POISONED'
} as const

export interface DoctrineEffect {
  type: (typeof DoctrineEffectType)[keyof typeof DoctrineEffectType]
  target: 'SELF' | 'ENEMY' | 'ALL_ENEMIES'
  value?: number
  duration?: number
  statusEffect?: (typeof StatusEffect)[keyof typeof StatusEffect]
}

export interface DoctrineDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  flavorTextKey: string
  className: CharacterClassName
  magicNature: MagicNature
  tier: number
  manaCost: number
  isUltimate: boolean
  effects: DoctrineEffect[]
}
```

---

#### [MODIFY] [character.types.ts](file:///Users/yifan/Projects/arq/shared/types/character.types.ts)

Add equipped doctrines to `CharacterClassType`:

```typescript
export interface CharacterClassType {
  // ... existing fields
  equippedDoctrines: string[] // Array of doctrine IDs, max 2
}
```

---

### Database Schema

#### [MODIFY] [schema.prisma](file:///Users/yifan/Projects/arq/server/prisma/schema.prisma)

Add `equippedDoctrines` field to CharacterClass model:

```prisma
model CharacterClass {
  // ... existing fields
  equippedDoctrines String[] @default([])
}
```

Then run:

```bash
npx prisma db push
npx prisma generate
```

---

### Backend Services

#### [NEW] [doctrine.service.ts](file:///Users/yifan/Projects/arq/server/services/doctrine.service.ts)

- `getAvailableDoctrines(className, tier)`: Returns doctrines available for class/tier
- `equipDoctrine(userId, doctrineId)`: Equip a doctrine (max 2, validate tier/class)
- `unequipDoctrine(userId, doctrineId)`: Unequip a doctrine
- Equipped doctrines returned via `getCurrentClass` query

---

### tRPC Routes

#### [MODIFY] [character.router.ts](file:///Users/yifan/Projects/arq/server/routers/character.router.ts)

Add:

- `character.availableDoctrines`: Get available doctrines for current class/tier
- `character.equipDoctrine`: Equip a doctrine
- `character.unequipDoctrine`: Unequip a doctrine

---

### Translations

Add to both EN/ES files:

```json
"doctrines": {
  "title": "Doctrines" / "Doctrinas",
  "available": "Available Doctrines" / "Doctrinas Disponibles",
  "equipped": "Equipped Doctrines" / "Doctrinas Equipadas",
  "max_equipped": "You can only equip 2 doctrines" / "Solo puedes equipar 2 doctrinas",
  "tier_required": "Requires Tier {{tier}}" / "Requiere Tier {{tier}}",
  "equip": "Equip" / "Equipar",
  "unequip": "Unequip" / "Desequipar",
  "mana_cost": "Cost: {{cost}} Mana" / "Coste: {{cost}} Maná",
  "ultimate": "Ultimate",
  "magic_nature": {
    "order": "Order" / "Orden",
    "chaos": "Chaos" / "Caos"
  }
}
```

#### [NEW] [doctrines.ts](file:///Users/yifan/Projects/arq/shared/constants/doctrines.ts)

Define doctrines for 2 classes (Templar, Herald) Tiers 1-3, using `Record` for O(1) lookups:

```typescript
export const DOCTRINES: Record<string, DoctrineDefinition> = {
  truth_blade: { ... },
  // etc.
}
```

Add all doctrine translations to EN/ES files.

#### [MODIFY] [combat.service.ts](file:///Users/yifan/Projects/arq/server/services/combat.service.ts)

- Add method `useDoctrine(params)`: Apply doctrine effects during combat
- Track active buffs/debuffs on player and enemies
- Implement status effect damage at turn start (DOTs)

#### [MODIFY] Combat Arena Component

- Add doctrine selection/use UI
- Display mana cost and validate availability
- Show active status effects

---

## Verification Plan

### Build Verification

Run builds to check for errors:

```bash
cd /Users/yifan/Projects/arq/server && npm run build
cd /Users/yifan/Projects/arq/front && npm run build
```

### Manual Testing

**Phase 1 - Consumables:**

1. Verify consumables appear in Store
2. Purchase potion, verify gold deducted
3. Enter combat, verify potion buttons appear
4. Use Health Potion in combat - verify health restored
5. Verify potion removed from inventory
6. Test EN/ES translations

**Phases 2 - Doctrines:**

1. Verify available doctrines match class/tier
2. Equip 2 doctrines, verify third blocked
3. Use doctrine in combat, verify mana deducted
4. Test status effects persist across turns
