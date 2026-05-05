# Frontend Architecture Evolution: Deep Dive

This document provides a detailed comparison of the frontend architectural shifts in Covenant, moving from traditional React patterns to a highly structured, scalable approach.

## 1. Component Structure & Subdomains

### Legacy vs. New Patterns

| Feature          | Legacy (Before)     | New Covenant (After)         | Rationale & Significance                                                                                                                                                                                         |
| :--------------- | :------------------ | :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Organization** | Unified Large Files | **4-Subdomain Pattern**      | **Reasoning**: Reduces cognitive load by separating presentation (`*.component`), logic (`*.utils`), types (`*.model`), and constants (`*.config`). This prevents "mega-files" and makes bugs easier to isolate. |
| **Naming**       | Generic Naming      | **Subdomain Suffixes**       | **Reasoning**: Ensures unique file names in the global namespace. Typing `dashboard.page` or `auth.store` in an IDE allows for instant navigation without name collisions.                                       |
| **Exports**      | Const Exports       | **Default Function Exports** | **Reasoning**: Improves developer experience with better stack traces and React DevTools naming. Ensures compatibility with standard React toolchains like `React.lazy`.                                         |

---

## 2. Strict Colocation & "Delete-ability"

### Three-Tiered Organization

1. **View-Local**: Components used by only ONE view live inside that view's `components/` folder.
2. **Domain-Shared**: Shared across one domain live in `views/[domain]/components/`.
3. **Global-Shared**: Primitives live in `src/components/[ui|common|forms]`.

### Why this approach?

- **Zero Orphaned Code**: By keeping components as close as possible to where they are used, we follow the **Delete-ability** principle. Deleting a view folder automatically cleans up all associated logic and types, preventing technical debt from accumulating.
- **Improved Context**: Developers don't have to jump across the entire tree to find a helper function or a type definition related to the current feature.

---

## 3. CSS Optimization & Design Tokens

Migrated to **Tailwind CSS v4** for a centralized, CSS-first theme.

### Why this approach?

- **Standardized Palette**: Replaces ad-hoc hardcoded colors with a single source of truth in `src/styles/tokens.css`, ensuring visual consistency.
- **Tailwind v4 Optimization**: Uses the high-performance Oxide engine for sub-millisecond builds. Unlike v3, v4 theme tokens are native CSS variables, allowing for dynamic styling and third-party integration without JavaScript bridge overhead.
- **Semantic Meaning**: Using `tier-1` or `rarity-rare` variables instead of raw hex codes makes the code self-documenting and facilitates global design changes.

---

## 4. "Base Wrapper" Pattern

### Why this approach?

- **Enforced UX Consistency**: Radix and Shadcn primitives are powerful but unopinionated. By using wrappers like `BaseFormDialog` and `BaseConfirmDialog`, we guarantee that every component (modals in this case) in the app has the characteristics.
- **Accessibility by Default**: These wrappers contain the "correct" ARIA and keyboard navigation patterns prescribed by the design system, ensuring they aren't forgotten during individual feature development.

---

## 5. New Infrastructure Changes

- **Deep Imports via Aliases**: **Reasoning**: Instead of barrel files (`index.ts`), we use explicit deep imports (e.g., `import Button from '@/ui/button.component'`). This improves tree-shaking, reduces circular dependency risks, and makes it clearer exactly where a component is located. Path aliases are maintained to keep these deep imports concise.
- **Path Aliases**: **Reasoning**: Simplifies imports by replacing fragile relative paths (`../../../`) with descriptive aliases (`@/ui`, `@/stores`). This makes code relocation significantly less painful.
