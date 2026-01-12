# Backend Architecture Specification (Simplified)

> **Version**: 1.1  
> **Status**: Draft  
> **Last Updated**: 2026-01-11

## Executive Summary

Evolve the current backend towards a cleaner architecture **without adding unnecessary complexity**. The goals are:

1. Extract logic from routers
2. Organize services by domain
3. Organize repositories by domain
4. Improve typing for `jsonb` fields.

**We will NOT use**: DI containers, CQRS, complex events, separate value objects.

## 1. Current Problems

| Problem             | Example                                                 |
| ------------------- | ------------------------------------------------------- |
| Logic in routers    | `missions.router.ts` has 130 lines of logic in `attack` |
| `as any` everywhere | `enemyState as unknown as EnemyState[]`                 |

## 2. Simplified Architecture

```
┌─────────────────────────────────┐
│         Routers (tRPC)          │  ← Validation + call services
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│           Services              │  ← All business logic
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│         Repositories            │  ← Reusable queries
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│            Prisma               │  ← ORM
└─────────────────────────────────┘
```

## 3. New Folder Structure

```
server/
├── routers/                # Input/output only
│   ├── character.router.ts
│   ├── mission.router.ts
│   └── ...
│
├── services/               # Business logic
│   ├── combat/
│   │   ├── combat.service.ts
│   │   └── dice.service.ts
│   ├── character/
│   │   ├── character.service.ts
│   │   └── inventory.service.ts
│   └── mission/
│       ├── mission.service.ts
│       └── phase.service.ts
│
├── repositories/           # Reusable queries
│   ├── character.repository.ts
│   ├── mission.repository.ts
│   └── party.repository.ts
│
├── lib/
│   └──  prisma.ts
│
└── server.ts

shared/                     # Already exists
├── types/
│   ├── combat.types.ts     # CombatParams, CombatResult, etc.
│   └── ...
└── ...
```

## 4. Services as Classes

Instead of standalone functions, group them into classes with related methods:

### Before (Current)

```typescript
// services/combat.services.ts - standalone functions
export const rollDice = (count: number) => { ... }
export const calculateHitsWithCount = (...) => { ... }
export const resolveCombatTurn = (...) => { ... }
```

### After (Proposed)

```typescript
// services/combat/combat.service.ts
export class CombatService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  rollDice(count: number): number[] {
    return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
  }

  resolveTurn(params: CombatParams): CombatResult {
    // All combat logic here
  }

  async executeAttack(userId: string, diceCount: number): Promise<AttackResult> {
    // 1. Load data
    const character = await this.getCharacterWithMission(userId)

    // 2. Validate
    if (character.diceBank < diceCount) {
      throw new AppError('NOT_ENOUGH_DICE')
    }

    // 3. Execute combat
    const result = this.resolveTurn({ ... })

    // 4. Save
    await this.saveResults(character, result)

    return result
  }
}
```

## 5. Simplified Router

```typescript
// routers/missions.router.ts
import { CombatService } from '../services/combat/combat.service'

// Instantiate services (without DI container)
const combatService = new CombatService(prisma)

export const missionsRouter = t.router({
  attack: protectedProcedure
    .input(z.object({ diceCount: z.number().min(1).max(14) }))
    .mutation(async ({ ctx, input }) => {
      // The router only calls the service
      return combatService.executeAttack(ctx.user.id, input.diceCount)
    })

  // ... other procedures equally simple
})
```

## 6. Migration Plan

- [ ] Create missing service and repository folder structure.
- [ ] Convert current functions to classes `CombatService`, `MissionService`
- [ ] Move logic from `missions.router.ts` to `CombatService.executeAttack()`

## 7. Summary of Changes

| Before               | After                |
| -------------------- | -------------------- |
| Logic in routers     | Logic in services    |
| Standalone functions | Classes with methods |
| Scattered `as any`   | Centralized types    |

## 8. What We Are NOT Doing

- ❌ CQRS / Commands / Queries
- ❌ Complex Event Bus
- ❌ Separate Value Objects
- ❌ DI Container (InversifyJS, etc.)
- ❌ Formal Domain Events

We keep the architecture **simple and pragmatic**.
