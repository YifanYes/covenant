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

## Phase 2: Doctrine System - Foundation

- [ ] Create doctrine.types.ts (DoctrineDefinition, DoctrineEffect, StatusEffect)
- [ ] Add equippedDoctrines to CharacterClass schema
- [ ] Run prisma db push + generate
- [ ] Create doctrine.service.ts (equip/unequip/available)
- [ ] Add doctrine routes to character.router.ts
- [ ] Add translation keys for doctrine UI (EN/ES)

## Phase 3: Doctrine Definitions

- [ ] Define Templar Tier 1-3 doctrines
- [ ] Define Herald Tier 1-3 doctrines
- [ ] Define Inquisitor Tier 1-3 doctrines
- [ ] Define Demon Hunter Tier 1-3 doctrines
- [ ] Add translation keys for all doctrines (EN/ES)

## Phase 4: Doctrine Combat Integration

- [ ] Implement useDoctrine in combat.service.ts
- [ ] Add status effect tracking
- [ ] Implement DOT damage at turn start
- [ ] Create doctrine UI in combat arena

## Verification

- [ ] Manual testing of consumable purchase and use
- [ ] Manual testing of doctrine equip/unequip
- [ ] Manual testing of doctrine use in combat
