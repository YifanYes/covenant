# Roadmap

## 🚀 Fase 1: Cimientos y Gamificación Base (Completado)

- **Sistema de Autenticación**
  - [x] Registro e Inicio de sesión de usuarios con Supabse Auth.
  - [x] Onboarding inicial para nuevos usuarios. Selección de Clase y Título del personaje.
- **Gestión de Tareas (Task Management)**
  - [x] Creación, edición y eliminación de tareas.
  - [x] Múltiples vistas: Lista, Calendario, Tabla y Matriz de Eisenhower.
- **Hábitos (Habits)**
  - [x] Sistema de seguimiento de hábitos diarios con creación, actualización, eliminación y seguimiento.
- **Áreas y Objetivos**
  - [x] Organización por Áreas de vida.
  - [x] Definición de Objetivos a largo plazo asociados a áreas.
- **Sistema RPG (Inventario/Personaje)**
  - [x] Perfil de Personaje con Atributos (Fuerza, Sabiduría, Resistencia, Fe).
  - [x] Visualización de Nivel, Experiencia, Vida y Maná.
- **Internacionalización**
  - [x] Soporte multi-idioma con i18next.

## 🔜 Fase 2: Expansión de Mecánicas (Próximamente)

- [ ] Crear componentes base reutilizables `BaseFormDialog.tsx` y `BaseConfirmDialog.tsx`. Refactorizar diálogos CRUD para usar componentes base.
- [ ] Optimizar `index.css`. Actualmente tiene **4,058 bytes**. Usar más variables CSS de Tailwind y extraer tokens de diseño a un archivo separado.
- [ ] Implementación de mecánicas de gamificación. Integración con tareas, hábitos y objetivos.
- [ ] Sistema de Equipamiento y Progresión de Niveles.
- [ ] Sistema de Misiones.
- [ ] Sistema de Combate.
- [ ] Módulo de journaling
