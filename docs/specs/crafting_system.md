# Crafting System Specification

## Overview

A material-based crafting system where players collect materials from combat and activities to craft items via recipes. Materials follow the established lore from `Tecnologia.md`, starting with Tier 1-3 materials and expanding later.

## Design Goals

1. **Lore-consistent**: Use materials defined in Tecnologia.md
2. **Progression-tied**: Recipes unlock based on character tier, activities completion and map status.
3. **Combat-integrated**: Materials drop from enemies, activities and events.
4. **Extensible**: Foundation for upgrades, discovery, salvaging later

## Materials (Phase 1: Tiers 1-3)

### Tier 1: Materiales Mundanos

| Material          | ID                 | Category | Drop Source     | Rarity |
| ----------------- | ------------------ | -------- | --------------- | ------ |
| Acero Funcional   | `functional_steel` | ORE      | Shop            | Common |
| Madera de Sauce   | `willow_wood`      | ESSENCE  | Minions (magic) | Common |
| Cobre             | `copper`           | ESSENCE  | Minions (magic) | Common |
| Cristal de Cuarzo | `quartz_crystal`   | FRAGMENT | Any minion      | Rare   |

### Tier 2: Materiales Tratados

| Material        | ID                 | Category | Drop Source | Rarity   |
| --------------- | ------------------ | -------- | ----------- | -------- |
| Acero Reforzado | `reinforced_steel` | ORE      | Shop        | Uncommon |
| Hierro Frío     | `cold_iron`        | ORE      | Elites      | Rare     |

### Tier 3: Materiales Nobles

| Material      | ID              | Category | Drop Source        | Rarity    |
| ------------- | --------------- | -------- | ------------------ | --------- |
| Acero Sagrado | `sacred_steel`  | ORE      | Shop               | Rare      |
| Plata         | `silver`        | ESSENCE  | Bosses             | Uncommon  |
| Oro           | `gold_material` | ESSENCE  | Bosses             | Rare      |
| Éter          | `ether`         | ESSENCE  | Magic bosses       | Legendary |
| Iridio        | `iridium`       | FRAGMENT | Special encounters | Legendary |

### Material Categories

```typescript
MaterialCategory = 'ORE' | 'ESSENCE' | 'FRAGMENT' | 'COMPONENT'
```

- **ORE**: Metal-based materials for physical equipment
- **ESSENCE**: Magical conductors for magic equipment/enchantments
- **FRAGMENT**: Rare components from powerful enemies
- **COMPONENT**: Intermediate crafted materials (future)

## Drop Tables

### Enemy Type → Material Drops

| Enemy Type            | Tier 1 Materials                                      | Tier 2 Materials                        | Tier 3 Materials                 |
| --------------------- | ----------------------------------------------------- | --------------------------------------- | -------------------------------- |
| **MINION (Physical)** | functional_steel (40%), quartz_crystal (10%)          | -                                       | -                                |
| **MINION (Magic)**    | willow_wood (30%), copper (30%), quartz_crystal (10%) | -                                       | -                                |
| **ELITE**             | functional_steel (50%), quartz_crystal (20%)          | reinforced_steel (30%), cold_iron (15%) | -                                |
| **BOSS (Physical)**   | functional_steel (60%), quartz_crystal (40%)          | reinforced_steel (50%), cold_iron (30%) | sacred_steel (25%), silver (30%) |
| **BOSS (Magic)**      | willow_wood (40%), copper (40%)                       | reinforced_steel (40%)                  | gold_material (25%), ether (15%) |

### Drop Quantity Ranges

| Enemy Type | Min Qty | Max Qty |
| ---------- | ------- | ------- |
| MINION     | 1       | 2       |
| ELITE      | 2       | 4       |
| BOSS       | 3       | 6       |

## Recipes (Phase 1)

### Tier 1 Recipes (Unlocked at Tier 1)

| Recipe              | Ingredients                         | Result                                   |
| ------------------- | ----------------------------------- | ---------------------------------------- |
| **Poción de Salud** | 2x quartz_crystal + 10 gold         | health_potion                            |
| **Poción de Maná**  | 2x willow_wood + 10 gold            | mana_potion                              |
| **Vara de Sauce**   | 3x willow_wood + 2x copper + 0 gold | willow_wand (craft alternative to store) |

### Tier 2 Recipes (Unlocked at Tier 2)

| Recipe                      | Ingredients                                         | Result          |
| --------------------------- | --------------------------------------------------- | --------------- |
| **Sable de Oficial**        | 5x functional_steel + 2x reinforced_steel + 30 gold | official_sabre  |
| **Báculo de Ébano**         | 4x willow_wood + 2x quartz_crystal + 30 gold        | ebony_staff     |
| **Armadura de Hierro Frío** | 6x reinforced_steel + 3x cold_iron + 50 gold        | cold_iron_armor |

### Tier 3 Recipes (Unlocked at Tier 3)

| Recipe               | Ingredients                                                | Result             |
| -------------------- | ---------------------------------------------------------- | ------------------ |
| **Gota de Agua**     | 4x sacred_steel + 2x silver + 3x quartz_crystal + 100 gold | water_drop_blade   |
| **Susurro del Éter** | 3x ether + 4x gold_material + 2x iridium + 150 gold        | ether_whisper_wand |

## Technical Implementation

### Database Changes

```prisma
model Character {
  // Add new field
  materials Json? @default("{}")  // Record<materialId, quantity>
}
```

### New Files

| File                                  | Purpose                             |
| ------------------------------------- | ----------------------------------- |
| `shared/constants/materials.ts`       | Material definitions following lore |
| `shared/constants/recipes.ts`         | Recipe definitions                  |
| `shared/constants/drop-tables.ts`     | Enemy → material drop tables        |
| `shared/types/crafting.types.ts`      | TypeScript types                    |
| `shared/schemas/crafting.schemas.ts`  | Zod validation schemas              |
| `server/services/crafting.service.ts` | Crafting business logic             |
| `server/routers/crafting.router.ts`   | tRPC endpoints                      |

### Files to Modify

| File                                          | Change                                |
| --------------------------------------------- | ------------------------------------- |
| `server/prisma/schema.prisma`                 | Add `materials` field to Character    |
| `server/repositories/character.repository.ts` | Add material CRUD methods             |
| `server/services/service.factory.ts`          | Register CraftingService              |
| `server/routers/index.ts`                     | Register craftingRouter               |
| `server/services/combat.service.ts`           | Add material drops after enemy defeat |
| `front/public/locales/en/translation.json`    | Add crafting i18n keys                |
| `front/public/locales/es/translation.json`    | Add crafting i18n keys (Spanish)      |

### tRPC Endpoints

```typescript
crafting.listRecipes // Query: Get recipes with canCraft status
crafting.getMaterials // Query: Get player's material inventory
crafting.craft // Mutation: Craft an item from recipe
```

### Service Methods

```typescript
class CraftingService {
  listRecipes(userId): RecipeListResult
  getMaterials(userId): MaterialInventoryResult
  craftItem(userId, recipeId): CraftResult
}
```

## Frontend

### New Page: `/crafting`

```
front/app/(workspace)/crafting/
  page.tsx                              # Main crafting view
  _components/
    crafting-panel.component.tsx        # Recipe list + craft button
    material-inventory.component.tsx    # Material grid display
    recipe-card.component.tsx           # Single recipe with ingredients
```

### UI Requirements

1. **Material Inventory Grid**: Show owned materials with icons, quantities, tier badges
2. **Recipe List**: Filterable by category (weapon, armor, consumable), show craftable status
3. **Recipe Detail**: Show required ingredients, highlight missing materials
4. **Craft Button**: Disabled if missing ingredients, shows cost summary

## i18n Keys

Add to both `en/translation.json` and `es/translation.json`:

```json
{
  "crafting": {
    "title": "Forja / Crafting",
    "materials": "Materiales / Materials",
    "recipes": "Recetas / Recipes",
    "craft": "Forjar / Craft",
    "ingredients": "Ingredientes / Ingredients",
    "result": "Resultado / Result",
    "tier_required": "Requiere Tier {{tier}} / Requires Tier {{tier}}",
    "missing_materials": "Materiales faltantes / Missing Materials",
    "craft_success": "Objeto forjado / Item crafted",
    "insufficient_materials": "Materiales insuficientes / Insufficient materials"
  },
  "materials": {
    "functional_steel": { "name": "Acero Funcional / Functional Steel" },
    "willow_wood": { "name": "Madera de Sauce / Willow Wood" },
    "copper": { "name": "Cobre / Copper" },
    "quartz_crystal": { "name": "Cristal de Cuarzo / Quartz Crystal" },
    "reinforced_steel": { "name": "Acero Reforzado / Reinforced Steel" },
    "cold_iron": { "name": "Hierro Frío / Cold Iron" },
    "sacred_steel": { "name": "Acero Sagrado / Sacred Steel" },
    "silver": { "name": "Plata / Silver" },
    "gold_material": { "name": "Oro / Gold" },
    "ether": { "name": "Éter / Ether" },
    "iridium": { "name": "Iridio / Iridium" }
  }
}
```

## Implementation Phases

### Phase 1: Backend Foundation

1. Database migration (add `materials` field)
2. Material definitions (`shared/constants/materials.ts`)
3. Recipe definitions (`shared/constants/recipes.ts`)
4. Drop tables (`shared/constants/drop-tables.ts`)
5. Types and schemas

### Phase 2: Backend Services

6. Character repository material methods
7. CraftingService implementation
8. CraftingRouter endpoints
9. Register in service factory and router index

### Phase 3: Combat Integration

10. Add material drops to combat.service.ts
11. Return drops in combat results

### Phase 4: Frontend

12. i18n keys (both locales)
13. Crafting page and components
14. Navigation link

### Phase 5: Testing

15. Service unit tests
16. Manual testing flow
17. UI polish

## Future Expansion

### Equipment Upgrading (Phase 2)

- Upgrade recipes: item + materials → better item
- Stat improvements or rarity upgrades

### Recipe Discovery (Phase 3)

- Hidden recipes unlocked through gameplay
- Boss drops can include recipe scrolls

### Salvaging (Phase 4)

- Break down items into materials
- Recovery rate based on item rarity

### Higher Tier Materials (Phase 5+)

- Tiers 4-6: Exotic materials from special content
- Tiers 7-10: Endgame materials from raids/special events

## Verification Checklist

- [ ] Database migration successful (`npx prisma db push`)
- [ ] Materials drop from combat (check API response)
- [ ] Recipes display correctly with availability status
- [ ] Crafting consumes materials and creates item
- [ ] Crafted items appear in inventory
- [ ] i18n works in both EN and ES
- [ ] Tests pass (`cd server && pnpm test`)
- [ ] Lint passes (`cd front && pnpm lint`)
