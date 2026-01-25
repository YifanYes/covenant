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

- [x] Crear componentes base reutilizables `BaseFormDialog.tsx` y `BaseConfirmDialog.tsx`. Refactorizar diálogos CRUD para usar componentes base.
- [x] Optimizar `index.css`. Actualmente tiene **4,058 bytes**. Usar más variables CSS de Tailwind y extraer tokens de diseño a un archivo separado.
- **Gamificación - Fase 1: Motor RPG y Economía de Dados**
  - [x] Migración de base de datos (Atributos Lore, Inventario, DiceBank).
  - [x] Lógica de obtención de dados por Tareas/Hábitos/Objetivos y Bonus de consistencia.
- **Gamificación - Fase 2: Identidad y Equipamiento**
  - [x] Rediseño de vista de Personaje con nuevos atributos y sistema de Inventario/Loadout.
  - [x] Definición de constantes de ítems Tier 1, 2 y 3.
  - [x] Sistema de equipar/desequipar items del inventario con traducciones i18n.
- **Gamificación - Fase 3: El Centro de Aventuras (Misiones)**
  - [x] Pestaña de "Aventura" y selector de misiones con persistencia y gating por Tier.
- **Gamificación - Fase 4: Combate Reactivo**
  - [x] UI de lanzamiento de dados animado y resolver de combate (Ataque/Defensa simultánea).
  - [x] Arena de combate, visualización de enemigos y log de eventos.
- **Gamificación - Fase 5: Cierre del Bucle y Pulido**
  - [x] Tienda para comprar equipamiento con oro.
  - [x] Sección de mapa con actividades comunitarias que sustituye al sistema de misiones.
  - [x] Sistema de consumibles.
  - [x] Sistema de doctrinas.
  - [x] Sistema de inversiones.
  - [ ] Foro por facción.
  - [ ] Renderizar el personaje con los items equipados.
  - [ ] Definir accesorios
  - [ ] Definir decisiones de la historia
  - [x] Añadir tests
  - [ ] Landing page

## 🔮 Fase 3: Características Avanzadas (Futuro)

- [ ] Módulo de journaling
- [ ] **Sistema PvP**: Duelos entre jugadores usando el sistema de dados
- [ ] **Leaderboards**: Tablas de clasificación para competencia entre usuarios

## 📝 Notas

- **Tier 2 = Lanzamiento Beta cerrada**: Después de implementar Tier 2, se planificarán los próximos pasos de la aplicación en base al feedback obtenido.
- **No Trading de Dados**: Los dados no se pueden intercambiar entre jugadores, ni se podrán comprar con dinero. Solo se obtienen por ser productivo.
