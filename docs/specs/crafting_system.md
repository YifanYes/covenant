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
| Cobre             | `copper`           | ESSENCE  | Shop            | Common |
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

## Shop Materials

Materials with "Shop" as their source are purchasable from the store, not dropped by enemies.

### Material Shop Prices

| Material        | ID                 | Tier | Gold Cost |
| --------------- | ------------------ | ---- | --------- |
| Acero Funcional | `functional_steel` | 1    | 5         |
| Cobre           | `copper`           | 1    | 5         |
| Acero Reforzado | `reinforced_steel` | 2    | 15        |
| Acero Sagrado   | `sacred_steel`     | 3    | 50        |

### Shop Availability Rules

- Materials are available once the player reaches the corresponding tier
- No purchase limits (players can buy as many as they can afford)
- Shop materials provide a reliable crafting path independent of RNG drops

## Drop Tables

### Enemy Type → Material Drops

| Enemy Type            | Tier 1 Materials                        | Tier 2 Materials | Tier 3 Materials                 |
| --------------------- | --------------------------------------- | ---------------- | -------------------------------- |
| **MINION (Physical)** | quartz_crystal (15%)                    | -                | -                                |
| **MINION (Magic)**    | willow_wood (50%), quartz_crystal (10%) | -                | -                                |
| **ELITE (Physical)**  | quartz_crystal (30%)                    | cold_iron (25%)  | -                                |
| **ELITE (Magic)**     | willow_wood (40%), quartz_crystal (20%) | cold_iron (15%)  | -                                |
| **BOSS (Physical)**   | quartz_crystal (40%)                    | cold_iron (30%)  | silver (30%)                     |
| **BOSS (Magic)**      | willow_wood (50%)                       | -                | gold_material (25%), ether (15%) |
| **SPECIAL**           | quartz_crystal (50%)                    | cold_iron (40%)  | iridium (20%)                    |

### Drop Quantity Ranges

| Enemy Type | Min Qty | Max Qty |
| ---------- | ------- | ------- |
| MINION     | 1       | 2       |
| ELITE      | 2       | 4       |
| BOSS       | 3       | 6       |
| SPECIAL    | 1       | 3       |

## Recipes (Phase 1)

### Tier 1 Recipes (Unlocked at Tier 1)

| Recipe              | Category   | Ingredients                 | Result        | Qty |
| ------------------- | ---------- | --------------------------- | ------------- | --- |
| **Poción de Salud** | consumable | 2x quartz_crystal + 10 gold | health_potion | 3   |
| **Poción de Maná**  | consumable | 2x willow_wood + 10 gold    | mana_potion   | 3   |

> **Note**: Tier 1 equipment is free for all players, so only consumables are craftable at this tier.

### Tier 2 Recipes (Unlocked at Tier 2)

| Recipe                            | Category | Ingredients                                         | Result             | Qty |
| --------------------------------- | -------- | --------------------------------------------------- | ------------------ | --- |
| **Sable de Oficial**              | weapon   | 5x functional_steel + 2x reinforced_steel + 30 gold | official_sabre     | 1   |
| **Gran Hacha de Guerra**          | weapon   | 6x functional_steel + 3x cold_iron + 40 gold        | great_war_axe      | 1   |
| **Revólver Avanzado**             | weapon   | 3x reinforced_steel + 2x copper + 30 gold           | advanced_revolver  | 1   |
| **Báculo de Ébano**               | weapon   | 4x willow_wood + 2x quartz_crystal + 30 gold        | ebony_staff        | 1   |
| **Códice del Arcanista**          | weapon   | 3x willow_wood + 3x quartz_crystal + 40 gold        | arcanist_codex     | 1   |
| **Armadura de Hierro Frío**       | armor    | 6x reinforced_steel + 3x cold_iron + 50 gold        | full_plate_armor   | 1   |
| **Armadura de Placas de Bronce**  | armor    | 4x copper + 2x quartz_crystal + 40 gold             | bronze_plate_armor | 1   |

### Tier 3 Recipes (Unlocked at Tier 3)

| Recipe                     | Category | Ingredients                                                | Result                | Qty |
| -------------------------- | -------- | ---------------------------------------------------------- | --------------------- | --- |
| **Gota de Agua**           | weapon   | 4x sacred_steel + 2x silver + 3x quartz_crystal + 100 gold | water_drop            | 1   |
| **Rompe Guerras**          | weapon   | 5x sacred_steel + 3x cold_iron + 2x silver + 120 gold      | war_breaker           | 1   |
| **Color del Viento**       | weapon   | 3x sacred_steel + 2x silver + 2x quartz_crystal + 100 gold | wind_color            | 1   |
| **Susurro del Éter**       | weapon   | 3x ether + 4x gold_material + 2x iridium + 150 gold        | ether_whisper         | 1   |
| **Compendio de Verdades**  | weapon   | 4x ether + 3x gold_material + 3x iridium + 180 gold        | compendium_of_truths  | 1   |
| **Armadura Gótica**        | armor    | 6x sacred_steel + 4x cold_iron + 100 gold                  | gothic_armor          | 1   |
| **Armadura de Oro**        | armor    | 5x gold_material + 3x ether + 2x silver + 120 gold         | gold_plate_armor      | 1   |

### Recipe Categories

```typescript
RecipeCategory = 'weapon' | 'armor' | 'consumable' | 'accessory'
```

## Technical Implementation

### Database Changes

```prisma
model Character {
  // Add new field
  materials Json? @default("{}")  // Record<materialId, quantity>
}
```

### New Files

| File                                  | Purpose                               |
| ------------------------------------- | ------------------------------------- |
| `shared/constants/materials.ts`       | Material definitions following lore   |
| `shared/constants/recipes.ts`         | Recipe definitions                    |
| `shared/constants/drop-tables.ts`     | Enemy → material drop tables          |
| `shared/constants/shop-materials.ts`  | Material shop prices and availability |
| `shared/types/crafting.types.ts`      | TypeScript types                      |
| `shared/schemas/crafting.schemas.ts`  | Zod validation schemas                |
| `server/services/crafting.service.ts` | Crafting business logic               |
| `server/routers/crafting.router.ts`   | tRPC endpoints                        |

### Files to Modify

| File                                          | Change                                |
| --------------------------------------------- | ------------------------------------- |
| `server/prisma/schema.prisma`                 | Add `materials` field to Character    |
| `server/repositories/character.repository.ts` | Add material CRUD methods             |
| `server/services/service.factory.ts`          | Register CraftingService              |
| `server/routers/index.ts`                     | Register craftingRouter               |
| `server/services/combat.service.ts`           | Add material drops after enemy defeat |
| `server/services/shop.service.ts`             | Add material purchasing logic         |
| `server/routers/shop.router.ts`               | Add `buyMaterial` endpoint            |
| `front/public/locales/en/translation.json`    | Add crafting i18n keys                |
| `front/public/locales/es/translation.json`    | Add crafting i18n keys (Spanish)      |

### tRPC Endpoints

```typescript
// Crafting router
crafting.listRecipes // Query: Get recipes with canCraft status
crafting.getMaterials // Query: Get player's material inventory
crafting.craft // Mutation: Craft an item from recipe

// Shop router (extend existing)
shop.buyMaterial // Mutation: Purchase material from shop
shop.getMaterials // Query: Get purchasable materials with prices
```

### Service Methods

```typescript
class CraftingService {
  listRecipes(characterId): RecipeListResult
  getMaterials(characterId): MaterialInventoryResult
  craftItem(characterId, recipeId): CraftResult
}
```

### Crafted Item Destination

Crafted items are added to the character's `inventory` field (existing JSON array of item IDs). The `craftItem` method:

1. Validates recipe requirements (tier, materials, gold)
2. Deducts materials from `character.materials`
3. Deducts gold from `character.gold`
4. Adds result item(s) to `character.inventory`
5. Returns the crafted item details

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

### English (`en/translation.json`)

```json
{
  "crafting": {
    "title": "Crafting",
    "materials": "Materials",
    "recipes": "Recipes",
    "craft": "Craft",
    "ingredients": "Ingredients",
    "result": "Result",
    "tier_required": "Requires Tier {{tier}}",
    "missing_materials": "Missing Materials",
    "craft_success": "Item crafted",
    "insufficient_materials": "Insufficient materials"
  },
  "materials": {
    "functional_steel": { "name": "Functional Steel" },
    "willow_wood": { "name": "Willow Wood" },
    "copper": { "name": "Copper" },
    "quartz_crystal": { "name": "Quartz Crystal" },
    "reinforced_steel": { "name": "Reinforced Steel" },
    "cold_iron": { "name": "Cold Iron" },
    "sacred_steel": { "name": "Sacred Steel" },
    "silver": { "name": "Silver" },
    "gold_material": { "name": "Gold" },
    "ether": { "name": "Ether" },
    "iridium": { "name": "Iridium" }
  }
}
```

### Spanish (`es/translation.json`)

```json
{
  "crafting": {
    "title": "Forja",
    "materials": "Materiales",
    "recipes": "Recetas",
    "craft": "Forjar",
    "ingredients": "Ingredientes",
    "result": "Resultado",
    "tier_required": "Requiere Tier {{tier}}",
    "missing_materials": "Materiales faltantes",
    "craft_success": "Objeto forjado",
    "insufficient_materials": "Materiales insuficientes"
  },
  "materials": {
    "functional_steel": { "name": "Acero Funcional" },
    "willow_wood": { "name": "Madera de Sauce" },
    "copper": { "name": "Cobre" },
    "quartz_crystal": { "name": "Cristal de Cuarzo" },
    "reinforced_steel": { "name": "Acero Reforzado" },
    "cold_iron": { "name": "Hierro Frío" },
    "sacred_steel": { "name": "Acero Sagrado" },
    "silver": { "name": "Plata" },
    "gold_material": { "name": "Oro" },
    "ether": { "name": "Éter" },
    "iridium": { "name": "Iridio" }
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

Database: Schema updated with materials Json? @default("{}") field on Character model. Migration applied successfully.

Backend:

- Crafting service with getMaterials, listRecipes, and craftItem methods
- tRPC router with protected endpoints
- Store service extended with material purchase functionality
- Combat service updated to roll material drops on enemy defeat

Frontend:

- New /crafting page with tabs for Recipes and Materials
- Recipe cards showing ingredients, gold cost, and craftability status
- Material inventory display grouped by tier
- Category filtering (weapons, armor, consumables, accessories)
- Sidebar link with Dice icon

Shared:

- 11 materials across 3 tiers (Mundanos, Tratados, Nobles)
- 16 recipes for crafting weapons, armor, and consumables
- Drop tables based on enemy type and damage type
- Zod schemas for input validation

Fixed Issues:

- Changed import pattern for Select and Tabs components (default export + named exports)
- Replaced non-existent Hammer icon with Dice from @nsmr/pixelart-react

The system is ready for manual testing per the verification checklist:

- [x] Database migration successful (`npx prisma db push`)
- [ ] Droppable materials (willow_wood, quartz_crystal, cold_iron, silver, gold_material, ether, iridium) drop from combat
- [ ] Shop materials (functional_steel, copper, reinforced_steel, sacred_steel) purchasable from store
- [ ] Recipes display correctly with availability status
- [ ] Recipe filtering by category works
- [ ] Crafting consumes materials and gold, creates item(s)
- [ ] Crafted items appear in character inventory
- [ ] i18n works in both EN and ES
- [ ] Tests pass (`cd server && pnpm test`)
- [ ] Lint passes (`cd front && pnpm lint`)
