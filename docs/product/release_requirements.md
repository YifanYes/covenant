# Requerimientos de Lanzamiento (Beta) · Arq

> La beta no valida contenido ni estética. Valida si el sistema se sostiene bajo uso real. Todo lo que no contribuya a eso es ruido.

## Núcleo Funcional Estable

_Fundamentos técnicos sólidos para una experiencia sin interrupciones._

- [ ] **Autenticación básica:** Registro, login y recuperación de cuenta robustos.
- [ ] **Persistencia fiable:** Integridad total en el guardado de datos del usuario.
- [ ] **Sincronización:** Consistencia de estado entre diferentes sesiones y dispositivos.
- [ ] **Manejo de errores:** Feedback explícito ante fallos (fallos visibles, nunca silenciosos).

## Loop Jugable Completo

_El ciclo de juego debe estar cerrado y ser gratificante._

- [ ] **Ciclo cerrado:** `Tarea/Hábito` → `Acción` → `Recompensa` → `Progresión`.
- [ ] **Tiers 1–3:** Implementación completa de extremo a extremo para los primeros tres rangos.
- [ ] **Economía balanceada:** Costes, recompensas y consecuencias aplicadas según diseño.
- [ ] **Estado "AFK":** Cálculo determinista del progreso pasivo sin ambigüedades.

## Gamificación Mínima Consistente

_Sistemas de juego base operativos y claros._

- [ ] **Progresión:** Sistema de experiencia y niveles funcionando correctamente.
- [ ] **Feedback:** Recompensas claras (stats, desbloqueos, recursos) al instante.
- [ ] **Orden vs Caos:** Penalizaciones y fricción alineadas con la filosofía del juego.

## Identidad Mecánica Clara

_Diferenciación real del producto frente a otras apps de productividad._

- [ ] **Afinidad dinámica:** Impacto real de la dualidad Orden/Caos desde el primer momento.
- [ ] **Consecuencias reales:** Las decisiones mecánicas deben afectar el gameplay, no solo ser cosméticas.
- [ ] **Progreso dual:** Diferenciación nítida entre disciplina (progreso) y entropía (corrupción).

## Gestión de Productividad Sólida

_La herramienta de productividad debe ser útil por sí misma._

- [ ] **Gestión de tareas:** Flujo de creación, edición y completado sin fricción.
- [ ] **Métricas:** Visualización comprensible de datos de productividad.
- [ ] **Dashboard:** Estado real del jugador reflejado de forma estable y precisa.

## Onboarding Mínimo Obligatorio

_Guía básica para que el usuario no se sienta perdido._

- [ ] **Introducción funcional:** Explicación del loop y consecuencias (evitar lore pesado).
- [ ] **Estado inicial guiado:** Evitar decisiones irreversibles sin contexto previo.
- [ ] **UI Anti-vacío:** Ninguna pantalla debe aparecer vacía o sin instrucciones.

## Telemetría y Control

_Capacidad de análisis y reacción ante problemas._

- [ ] **Logging:** Registro de eventos clave (progreso, abandono, errores críticos).
- [ ] **Feature Flags:** Capacidad de balancear el juego sin necesidad de redeploy.
- [ ] **Wipe Tools:** Herramientas para resetear el progreso de usuarios beta si es necesario.

## Seguridad y Contención

_Protección del sistema y de los datos._

- [ ] **Validación Backend:** No confiar ciegamente en las peticiones del cliente.
- [ ] **Resiliencia:** Protección contra la corrupción de datos y sistemas de backup básicos.
- [ ] **Rollback:** Capacidad de realizar un rollback o wipe controlado ante fallos graves.

## UX Funcional

_Usabilidad por encima de la estética final._

- [ ] **Navegación:** Flujo claro entre las diferentes secciones de la app.
- [ ] **Estados de carga:** Skeletons o indicadores en todos los procesos asíncronos.
- [ ] **Bloqueos:** Cero bloqueos críticos en la interfaz de usuario.

## Alcance Estrictamente Limitado

_Menos es más. Calidad sobre cantidad._

- [ ] **Contenido curado:** Solo entre 3 y 10 misiones, pero perfectamente diseñadas.
- [ ] **Sistemas terminados:** Ninguna funcionalidad "a medio hacer" expuesta al usuario.
- [ ] **Foco absoluto:** Eliminar cualquier elemento que no contribuya a validar el core.
