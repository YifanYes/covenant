# Backend Architecture Specification (Simplified)

> **Version**: 1.1  
> **Status**: Draft  
> **Last Updated**: 2026-01-11

## Executive Summary

Evolucionar el backend actual hacia una arquitectura más limpia **sin añadir complejidad innecesaria**. El objetivo es:

1. Sacar lógica de los routers
2. Organizar servicios por dominio

**No usaremos**: DI containers, CQRS, eventos complejos, value objects separados.

## 1. Problemas Actuales

| Problema            | Ejemplo                                                     |
| ------------------- | ----------------------------------------------------------- |
| Lógica en routers   | `missions.router.ts` tiene 130 líneas de lógica en `attack` |
| `as any` everywhere | `enemyState as unknown as EnemyState[]`                     |

## 2. Arquitectura Simplificada

```
┌─────────────────────────────────┐
│         Routers (tRPC)          │  ← Validación + llamar servicios
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│           Services              │  ← Toda la lógica de negocio
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│         Repositories            │  ← Queries reutilizables
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│            Prisma               │  ← ORM
└─────────────────────────────────┘
```

## 3. Nueva Estructura de Carpetas

```
server/
├── routers/                # Solo input/output
│   ├── character.router.ts
│   ├── mission.router.ts
│   └── ...
│
├── services/               # Lógica de negocio
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
├── repositories/           # Queries reutilizables
│   ├── character.repository.ts
│   ├── mission.repository.ts
│   └── party.repository.ts
│
├── lib/
│   ├── prisma.ts
│   └── errors.ts
│
└── server.ts

shared/                     # Ya existente
├── types/
│   ├── combat.types.ts     # CombatParams, CombatResult, etc.
│   └── ...
└── ...
```

## 4. Servicios como Clases

En lugar de funciones sueltas, agrupar en clases con métodos relacionados:

### Antes (Actual)

```typescript
// services/combat.services.ts - funciones sueltas
export const rollDice = (count: number) => { ... }
export const calculateHitsWithCount = (...) => { ... }
export const resolveCombatTurn = (...) => { ... }
```

### Después (Propuesto)

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
    // Toda la lógica de combate aquí
  }

  async executeAttack(userId: string, diceCount: number): Promise<AttackResult> {
    // 1. Cargar datos
    const character = await this.getCharacterWithMission(userId)

    // 2. Validar
    if (character.diceBank < diceCount) {
      throw new AppError('NOT_ENOUGH_DICE')
    }

    // 3. Ejecutar combate
    const result = this.resolveTurn({ ... })

    // 4. Guardar
    await this.saveResults(character, result)

    return result
  }
}
```

## 5. Router Simplificado

```typescript
// routers/missions.router.ts
import { CombatService } from '../services/combat/combat.service'

// Instanciar servicios (sin DI container)
const combatService = new CombatService(prisma)

export const missionsRouter = t.router({
  attack: protectedProcedure
    .input(z.object({ diceCount: z.number().min(1).max(14) }))
    .mutation(async ({ ctx, input }) => {
      // El router solo llama al servicio
      return combatService.executeAttack(ctx.user.id, input.diceCount)
    })

  // ... otros procedures igual de simples
})
```

## 6. Manejo de Errores Simple

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message?: string
  ) {
    super(message || code)
  }
}

// Uso en servicios
throw new AppError('NOT_ENOUGH_DICE')
throw new AppError('NO_ACTIVE_MISSION')

// Middleware en router
const withErrorHandling = t.middleware(async ({ next }) => {
  try {
    return await next()
  } catch (error) {
    if (error instanceof AppError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.code
      })
    }
    throw error
  }
})
```

## 7. Plan de Migración

### Fase 1: Reorganizar servicios (1 semana)

- [ ] Crear estructura de carpetas `services/combat/`, `services/character/`, etc.
- [ ] Convertir funciones actuales a clases `CombatService`, `MissionService`
- [ ] Mover lógica de `missions.router.ts` a `CombatService.executeAttack()`

## 8. Resumen de Cambios

| Antes              | Después             |
| ------------------ | ------------------- |
| Lógica en routers  | Lógica en servicios |
| Funciones sueltas  | Clases con métodos  |
| `as any` dispersos | Tipos centralizados |

## 9. Lo que NO hacemos

- ❌ CQRS / Commands / Queries
- ❌ Event Bus complejo
- ❌ Value Objects separados
- ❌ DI Container (InversifyJS, etc.)
- ❌ Domain Events formales

Mantenemos la arquitectura **simple y pragmática**.
