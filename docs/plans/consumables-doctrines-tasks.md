# Consumables and Doctrines Implementation Tasks

## Planning Phase

- [x] Research lore files (Economia.md, Clases.md)
- [x] Analyze existing arq codebase structure
- [x] Review translation system (i18next)
- [x] Review existing item/type definitions
- [x] Write implementation plan
- [x] User approval

## Phase 1: Consumables System

- [x] Add `CONSUMABLE` to `ItemType` enum
- [x] Create consumable type definitions (Record-based)
- [x] Add consumable items (Health Potion, Mana Potion)
- [x] Add useConsumable logic to combat.service.ts
- [x] Add useConsumable mutation to character.router.ts
- [x] Add translation keys for consumables (EN/ES)
- [x] Add consumables to store
- [x] Update combat arena UI to show/use consumables

## Phase 2: Doctrine System

- [x] Create doctrine.types.ts (DoctrineDefinition, DoctrineEffect, StatusEffect)
- [x] Add equippedDoctrines to CharacterClass schema
- [x] Run prisma db push + generate
- [x] Create doctrine.service.ts (equip/unequip/available)
- [x] Add doctrine routes to character.router.ts
- [x] Define Templar Tier 1-3 doctrines (16 doctrines)
- [x] Define Herald Tier 1-3 doctrines (16 doctrines)
- [ ] Implement useDoctrine in combat.service.ts (deferred)
- [ ] Add status effect tracking (deferred)
- [ ] Implement DOT damage at turn start (deferred)
- [x] Create doctrine UI in inventory page
- [x] Create doctrine UI in combat arena
- [x] Add translation keys for all doctrines and doctrine UI (EN/ES)
- [ ] Update gamification.md with doctrine system for documentation

## Verification

- [x] TypeScript checks pass (server + frontend)
- [ ] Manual testing of consumable purchase and use
- [ ] Manual testing of doctrine equip/unequip
- [ ] Manual testing of doctrine use in combat
