# ARQ - Mejoras y Refactors Pendientes

## 🟡 Mejoras de Media Prioridad

### 1. Refactorizar Diálogos CRUD

Los 11 diálogos en `components/dialogs/` comparten mucha lógica duplicada.

| Patrón Create         | Patrón Update     | Patrón Delete                |
| --------------------- | ----------------- | ---------------------------- |
| CreateTaskDialog      | UpdateTaskDialog  | ConfirmDeleteHabitDialog     |
| CreateHabitDialog     | UpdateHabitDialog | ConfirmDeleteObjectiveDialog |
| CreateAreaDialog      | UpdateAreaDialog  | ConfirmDeleteAreaDialog      |
| CreateObjectiveDialog | -                 | ConfirmDeleteAccountDialog   |

**Recomendación:** Crear componentes base reutilizables:

```
components/dialogs/
├── BaseFormDialog.tsx      // Form dialog genérico
├── BaseConfirmDialog.tsx   // Confirm delete genérico
├── task/
│   ├── CreateTaskDialog.tsx
│   └── UpdateTaskDialog.tsx
└── ...
```

---

### 2. Servicios del Servidor Incompletos

Los servicios solo contienen funciones `getUserX`:

- `server/services/tasks.services.ts` - Solo `getUserTask`
- Misma situación en otros servicios

**Recomendación:** Mover la lógica de negocio de los routers a dos capas separadas: servicios y repositorios. Servicios son capas de negocio, repositorios son capas de acceso a datos.

**Antes (router.ts):**

```typescript
// Lógica inline en el router
const task = await ctx.prisma.task.create({ data: { ... } })
```

**Después:**

```typescript
// Router delega al servicio
const task = await taskService.create(ctx.prisma, input, ctx.user.id)
```

```typescript
// Servicio coordina los repositorios
const task = await taskRepository.create(ctx.prisma, input, ctx.user.id)
```

```typescript
// Repositorio accede a la base de datos
const task = await ctx.prisma.task.create({ data: { ... } })
```

---

## 🟢 Mejoras de Baja Prioridad

### 3. Index.css Puede Mejorarse

El archivo tiene **4,058 bytes**. Considerar:

- Usar más variables CSS de Tailwind
- Extraer tokens de diseño a un archivo separado
