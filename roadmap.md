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
- **Gamificación - Fase 1: Motor RPG y Economía de Dados**
  - [x] Migración de base de datos (Atributos Lore, Inventario, DiceBank).
  - [x] Lógica de obtención de dados por Tareas/Hábitos/Objetivos y Bonus de consistencia.
- **Gamificación - Fase 2: Identidad y Equipamiento**
  - [x] Rediseño de vista de Personaje con nuevos atributos y sistema de Inventario/Loadout.
  - [x] Definición de constantes de ítems Tier 1.
- **Gamificación - Fase 3: El Centro de Aventuras (Misiones)**
  - [x] Pestaña de "Aventura" y selector de misiones con persistencia y gating por Tier.
- **Gamificación - Fase 4: Combate Reactivo**
  - [ ] UI de lanzamiento de dados animado y resolver de combate (Ataque/Defensa simultánea).
  - [ ] Arena de combate, visualización de enemigos y log de eventos.
- **Gamificación - Fase 5: Cierre del Bucle y Pulido**
  - [ ] Sistema de Mana, Doctrinas, recompensas (XP/Oro/Loot) y estados de derrota.

## 🔮 Fase 3: Características Avanzadas (Futuro)

- [ ] Módulo de journaling
- [ ] **Sistema PvP**: Duelos entre jugadores usando el sistema de dados
- [ ] **Leaderboards**: Tablas de clasificación para competencia entre usuarios
- - [ ] **Misiones Estacionales**: Contenido basado en momentos de la historia
- [ ] **Sistema Co-op**: Juego cooperativo con sistema de party (2-4 jugadores)
  - [ ] Orden de turnos round-robin
  - [ ] Mecánicas de revivir con doctrinas/objetos raros
  - [ ] Sistema de loot individual
- [ ] **Escalado Dinámico de Enemigos**: Dificultad de enemigos basada en el banco de dados del jugador (previene acumulación excesiva)

## 📝 Notas

- **Tier 3 = Demo Completo**: Después de implementar Tier 3, se planificarán los próximos pasos de la aplicación
- **No Trading de Dados**: Los dados no se pueden intercambiar entre jugadores
