# Marketing Plan Covenant - Primeros Usuarios Beta

> **Estado:** plan revisado contra el producto actual.
> **Fecha:** 8 junio 2026.
> **Objetivo:** conseguir 50-100 usuarios beta cualificados antes del 31 agosto 2026, con foco en usuarios que realmente prueban el loop central, no solo en registros.
> **Presupuesto:** 200 EUR/mes maximo. Gasto pagado solo despues de validar activacion.

---

## Resumen Ejecutivo

El plan anterior tenia una buena intuicion: Covenant no debe competir como "otra app de productividad". El hueco real es mas concreto:

**Covenant convierte trabajo real en poder RPG visible. Completa tareas. Gana mana. Mata demonios.**

La estrategia para los primeros usuarios debe ser menos "campana de marketing" y mas **reclutamiento beta de alta friccion y alto aprendizaje**. No necesitamos miles de visitas. Necesitamos 50-100 personas que entren, cierren el loop, reporten friccion y digan si volverian una semana despues.

El KPI principal no es waitlist, Discord, Twitter ni upvotes. Es:

**`loop_closed`: el usuario gana mana con una accion real y empieza una quest.**

El producto ya tiene la instrumentacion para medir ese momento via PostHog server-side. Eso cambia el plan: cada canal se juzga por usuarios que llegan a `loop_closed`, no por seguidores o impresiones.

---

## Diagnostico del Producto Actual

### Lo que ya esta listo para beta

| Area | Estado | Implicacion para marketing |
| ---- | ------ | -------------------------- |
| Landing | CTA directo a `/sign-up`, hero claro "Complete tasks. Kill demons." | Ya se puede enviar trafico a una experiencia real, no solo promesa |
| Auth | Email/password, Google OAuth, verificacion email, reset password | La friccion de entrada es aceptable para beta cerrada |
| Onboarding | Checklist "First Quest" + slides contextuales | El primer usuario tiene una ruta guiada hacia activacion |
| Core productividad | Tasks, habits, objectives, journaling, calendar | Puede absorber distintos perfiles de productividad |
| RPG loop | Mana, quests, combat, inventory, shop | La promesa diferencial existe dentro del producto |
| Comunidad in-app | Guilds, tavern, forum/campaign surfaces | Hay material para futuro social, aunque no debe ser el primer gancho |
| Analytics | PostHog v1 con `user_signed_up`, `character_created`, completions, `combat_started`, `combat_finished`, `loop_closed` | Se puede medir activacion sin depender solo de encuestas |
| Legal | Privacy/TOS beta | Suficiente para beta pequena, con pendiente operacional abajo |

### Bloqueadores antes de invitar desconocidos

| Bloqueador | Por que importa | Accion minima |
| ---------- | --------------- | ------------- |
| `privacy@covenantrpg.com` puede no estar configurado | Legal/credibilidad; la politica ya lo publica | Configurar forwarder antes de captar usuarios externos |
| Discord no preparado | El plan depende de feedback y comunidad propia | Crear servidor, roles, `#feedback`, `#bug-reports`, `#wins`, `#announcements` |
| Welcome email no existe | El usuario verifica email pero no recibe una narrativa beta clara | Enviar email simple: que probar, link Discord, como reportar bugs |
| Press kit/demo no existe | Reddit/X/creadores necesitan assets faciles | 30s GIF/video, 4 screenshots, pitch de 2 lineas |
| Copy/documentacion con restos de "dice" | El sistema actual es mana/reserve | Revisar assets publicos antes de outreach amplio |
| No hay cohortes de beta definidas | Sin batches, el feedback se vuelve caotico | Invitar por oleadas semanales de 10-20 usuarios |

**Decision recomendada:** para los primeros 100 usuarios, no construir waitlist nueva salvo que se quiera cerrar el acceso. Usar signup directo + email/Discord de bienvenida. Si el producto debe ser privado, entonces cambiar la landing a "Request beta access" antes de hacer outreach publico.

---

## Posicionamiento

### ICP inicial

Persona primaria:

**Gamers/productivity nerds de 20-40 anos que ya intentaron to-do apps, habit trackers o Habitica, pero abandonaron porque la recompensa se sentia decorativa, infantil o desconectada del esfuerzo real.**

No vender a "todo el mundo que quiere ser productivo". El primer nicho debe tener tres rasgos:

- Ya usa algun sistema de tareas/habitos.
- Entiende RPGs, builds, mana, quests o progresion.
- Esta dispuesto a probar una beta y dar feedback directo.

### Mensaje central

**Covenant is a gamified productivity app where real work becomes RPG power. Complete tasks, earn mana, and spend it in tactical quests.**

Version corta:

**Complete tasks. Kill demons.**

Version beta:

**Estoy construyendo una app de productividad para gente que quiere que sus tareas tengan consecuencias visibles: completas trabajo real, ganas mana, y lo gastas en combate RPG. Busco 50 beta testers que prueben el primer loop y me digan donde se rompe.**

### Que NO prometer aun

- No prometer una comunidad masiva.
- No vender PvP, warfronts, board game ni facciones como valor actual.
- No decir "mejor que Habitica"; decir "mas tactico, mas oscuro, mas centrado en poder ganado por trabajo real".
- No usar ADHD como canal primario salvo que el contenido sea responsable, personal y no medico.

---

## Oferta Beta

La invitacion no debe ser "prueba mi app". Debe ser una mision concreta:

**Beta Quest: cierra el loop en 20 minutos.**

1. Crea tu personaje.
2. Crea una tarea o habito real.
3. Completalo para ganar mana.
4. Empieza una quest.
5. Cuantame que parte fue confusa, emocionante o inutil.

Feedback pedido:

- Que momento te hizo pensar "vale, esto es distinto"?
- Donde casi abandonas?
- Volverias manana sin que te lo recuerde?
- Que app/sistema usas hoy para tareas o habitos?

Esto convierte cada usuario en aprendizaje accionable.

---

## Canales Prioritarios

La regla sigue siendo buena: **maximo 2 canales primarios a la vez.**

Para primeros usuarios, el orden recomendado cambia:

| Prioridad | Canal | Coste | Objetivo |
| --------- | ----- | ----- | -------- |
| 1 | Warm-start + Discord | 0 EUR | Primeros 20 usuarios reales y feedback cualitativo |
| 2 | Reddit valor-first | 0 EUR | Usuarios exactos del nicho, captados sin spam |
| 3 | X / devlog + blog propio | 0 EUR | Prueba social, assets, continuidad |
| 4 | Micro-creador | 150-200 EUR | Solo si la activacion ya funciona |
| 5 | Product Hunt / launch directories | 0 EUR | No antes de tener 100+ usuarios activados o una version muy pulida |

### Canal 1: Warm-start + Discord

Antes de ir a desconocidos, reclutar una primera cohorte manual.

Fuentes:

- Amigos gamers/productivity nerds.
- Mutuales de X/Discord.
- Comunidades pequenas donde ya tengas presencia.
- Ex-usuarios de Habitica que conozcas personalmente.
- Dev/build-in-public contactos.

Script corto:

```text
Estoy probando Covenant, una app de productividad RPG: completas tareas reales, ganas mana y lo gastas en quests tacticas.

No busco "likes"; busco 10 personas que hagan una prueba de 20 minutos y me digan brutalmente donde se rompe o donde engancha.

Te paso acceso? La mision beta es: crea personaje -> completa una tarea/habito -> gana mana -> empieza una quest.
```

Meta: 20 usuarios invitados, 10 `loop_closed`, 5 entrevistas/DMs largos.

### Canal 2: Reddit valor-first

Reddit puede funcionar, pero no como link-drop. Usarlo para conversaciones utiles y feedback explicito.

Subreddits candidatos a validar manualmente antes de postear:

| Subreddit | Uso recomendado |
| --------- | --------------- |
| `r/gamification` | Compartir aprendizajes de diseno y pedir critique |
| `r/productivity` | Post de valor sobre recompensas visibles y sistemas de seguimiento |
| `r/SideProject` | Build log honesto con demo |
| `r/IndieDev` / `r/IndieGaming` | Devlog si el post muestra gameplay real |
| `r/Habitica` | Solo si las reglas lo permiten y el post es comparativo/feedback, no captacion |

Reglas operativas:

- Leer reglas de cada subreddit antes de publicar.
- Participar 1-2 semanas con comentarios utiles antes del primer post propio.
- Publicar posts que funcionen sin link.
- Pedir feedback, no conversion.
- No repetir el mismo post en varios subreddits.
- No usar cuentas falsas ni engagement artificial.

Formatos:

- "I built a productivity RPG where real tasks become mana. Here is the activation loop I am testing."
- "What makes gamified productivity feel meaningful instead of fake?"
- "I replaced generic XP with mana you spend in combat. Would this motivate you or annoy you?"

Meta: 2 posts buenos/mes, 20-40 comentarios utiles/mes, 20 usuarios beta desde Reddit en 12 semanas.

### Canal 3: X / Devlog + Blog

No esperar conversion directa al principio. Sirve para crear historial publico, screenshots, y material que otros puedan compartir.

Cadencia minima:

| Frecuencia | Pieza |
| ---------- | ----- |
| 2x/semana | Screenshot/GIF de una feature real |
| 1x/semana | Mini devlog: decision, problema, antes/despues |
| 1x/2 semanas | Post largo en `/news` o hilo sobre diseno |

Temas buenos:

- "Why tasks earn mana instead of generic XP."
- "The first 20-minute beta quest."
- "What I learned watching someone fail onboarding."
- "Building a darker alternative to cute habit trackers."

Meta: 1 asset reutilizable por semana, no seguidores por seguidores.

### Canal 4: Micro-creadores

No gastar antes de cumplir estas condiciones:

- Al menos 30 usuarios han llegado a `loop_closed`.
- D7 retention de usuarios activados >= 25%.
- Hay demo de 30s y onboarding probado por usuarios externos.
- Discord tiene actividad semanal real.

Perfil:

- 5k-50k seguidores.
- Gaming/productivity, RPG, self-improvement o indie games.
- Engagement visible y comentarios reales.
- Dispuesto a probar el producto, no solo leer un guion.

Oferta:

- 150-200 EUR por una review honesta o "I tried this beta" con acceso real.
- Pedir critica publica honesta mejor que promo generica.

---

## Plan de 12 Semanas

### Semana 0: Readiness antes de invitar desconocidos

Checklist:

- Configurar `privacy@covenantrpg.com`.
- Crear Discord con canales minimos: `#announcements`, `#start-here`, `#feedback`, `#bug-reports`, `#wins`, `#general`.
- Crear email de bienvenida manual o automatizado.
- Preparar demo de 30s + 4 screenshots.
- Crear enlaces UTM por canal: `reddit`, `x`, `discord`, `warm`.
- Ejecutar el happy path completo como usuario nuevo.
- Revisar copy publica para que todo hable de mana/reserve, no de dice.

### Semanas 1-2: Cohorte manual

Objetivo: 10-20 usuarios invitados manualmente.

Acciones:

- Enviar 5-10 DMs/dia, maximo.
- Dar acceso en batches pequenos.
- Pedir que hagan la Beta Quest en 20 minutos.
- Hacer 5 entrevistas cortas o DMs estructurados.
- Corregir fricciones criticas antes de ampliar.

Exit criteria:

- 10 usuarios llegan a `loop_closed`.
- Sabes los 3 mayores puntos de confusion.
- Al menos 3 usuarios vuelven otro dia.

### Semanas 3-6: Comunidad externa pequena

Objetivo: 30-50 usuarios beta totales.

Acciones:

- Primer post en Reddit tras participacion previa.
- 2 updates/semana en X.
- 1 post largo/devlog cada 2 semanas.
- Invitar 10-15 usuarios por semana, no mas.
- Publicar weekly update en Discord cada viernes.

Exit criteria:

- `loop_closed` >= 30% de nuevos signups.
- D7 de activados >= 25%.
- 15 miembros Discord activos/semana.
- 10 piezas de feedback accionable.

### Semanas 7-10: Escalar solo lo que funciono

Objetivo: 50-100 usuarios beta.

Acciones:

- Doblar el canal con mejor ratio signup -> `loop_closed`.
- Activar referral narrativo simple si hay 30 usuarios activos: "Recluta un aliado".
- Contactar 5 micro-creadores; pagar 1 solo si las metricas anteriores se sostienen.
- Publicar una demo mas pulida con aprendizajes reales.

Exit criteria:

- 50 usuarios beta activos acumulados.
- 30+ usuarios con `loop_closed`.
- 10 usuarios han vuelto despues de 7 dias.
- Discord ya no depende 100% del fundador para cada conversacion.

### Semanas 11-12: Decision

Objetivo: decidir siguiente fase.

Preguntas:

- Que canal genero mas usuarios activados, no mas visitas?
- Que feature hizo que usuarios volvieran?
- Donde abandona la mayoria: signup, email verify, onboarding, mana, quest, combat?
- El posicionamiento "Complete tasks. Kill demons." atrae a los usuarios correctos?
- Hay suficiente senal para Product Hunt/public launch, o toca otra beta cerrada?

Decision:

- **Go public:** si activacion y D7 son solidos.
- **Otra beta cerrada:** si el loop engancha pero onboarding/friccion falla.
- **Product pivot:** si usuarios completan el loop pero no quieren volver.

---

## Metricas

### Dashboard principal

| KPI | Target S6 | Target S12 | Fuente |
| --- | --------- | ---------- | ------ |
| Signups | 40 | 120 | PostHog / auth |
| Character created | 30 | 90 | `character_created` |
| Loop closed | 15 | 50 | `loop_closed` |
| Signup -> loop_closed | >= 30% | >= 40% | Funnel PostHog |
| D7 retention activados | >= 25% | >= 35% | PostHog |
| Feedback cualitativo | 10 piezas | 25 piezas | Discord/DM |
| Discord activos/semana | 10 | 30 | Discord |

### Funnel de activacion

Medir:

```text
landing/pageview
  -> user_signed_up
  -> character_created
  -> task_completed OR habit_completed OR objective_completed OR journal_entry_created
  -> combat_started
  -> loop_closed
  -> return D1 / D7
```

Si el abandono ocurre antes de `character_created`, es problema de signup/onboarding.
Si ocurre despues de ganar mana pero antes de `combat_started`, es problema de conectar productividad con RPG.
Si ocurre despues de `loop_closed` pero no hay D7, el loop es interesante pero no recurrente.

### Metricas de canal

| Canal | Metrica buena | Metrica peligrosa |
| ----- | ------------- | ----------------- |
| Warm-start | `loop_closed` + feedback detallado | "Me parece guay" sin uso |
| Reddit | Comentarios profundos + signups activados | Upvotes sin signups |
| X/devlog | DMs, shares, usuarios que prueban | Impresiones vacias |
| Discord | Usuarios ayudandose/reportando | Servidor lleno pero silencioso |
| Influencer | Signups activados | Vistas sin activacion |

---

## Presupuesto

Mes 1:

- 0 EUR paid acquisition.
- Usar tiempo en setup, feedback, demo, Discord.

Mes 2:

- 0-50 EUR para herramientas si falta algo operativo.
- No pagar creadores todavia salvo oportunidad excepcional.

Mes 3:

- 150-200 EUR en una colaboracion si el producto ya prueba activacion.
- 0 EUR en ads. Ads optimizan volumen; Covenant aun necesita aprendizaje.

---

## Rutina Semanal del Fundador

Tiempo esperado: 10-12h/semana.

| Actividad | Horas |
| --------- | ----- |
| Hablar con beta users / Discord | 3h |
| Outreach manual | 2h |
| Reddit/X participacion real | 2h |
| Crear una pieza de contenido/demo | 2h |
| Revisar metricas y priorizar fixes | 1-2h |
| Admin/creadores/UTMs | 1h |

Ritual de viernes:

1. Publicar update corto: que se arreglo, que se aprendio, que se prueba la semana que viene.
2. Revisar funnel signup -> `loop_closed`.
3. Elegir un solo problema de activacion para mejorar.
4. Invitar la siguiente cohorte.

---

## Assets Necesarios

| Asset | Uso |
| ----- | --- |
| Demo 30s | Reddit, X, micro-creadores |
| 4 screenshots | Press kit, posts, Discord |
| Pitch 1 linea | Bio, posts, DMs |
| Pitch 2 lineas | Outreach y creador |
| Beta Quest instructions | Email/Discord onboarding |
| Feedback form | Recoger friccion sin perseguir a todos |
| UTM links | Atribucion por canal |

Pitch 1 linea:

**Covenant is a productivity RPG where real tasks become mana for tactical quests.**

Pitch 2 lineas:

**Complete tasks, habits, objectives, or journal entries to earn mana. Spend that mana in tactical RPG quests, win gold and gear, and make your real-world discipline visible.**

---

## Riesgos

| Riesgo | Mitigacion |
| ------ | ---------- |
| Marketing antes de producto estable | Cohortes pequenas, no launch publico aun |
| Discord vacio | Warm-start antes de invitar masa |
| Reddit te marca como spam | Valor primero, reglas de comunidad, no repetir links |
| Usuarios se registran pero no entienden que hacer | Beta Quest + checklist + email claro |
| Mucha promesa futura | Vender solo loop actual: tarea -> mana -> quest |
| Optimizar seguidores | Cortar cualquier canal que no produzca `loop_closed` |

---

## Fuentes Operativas

- Reddit Help: spam incluye acciones repetidas/no solicitadas y publicacion masiva para exposicion o ganancia; la promocion requiere cuidado con frecuencia y reglas de cada comunidad.
- Reddit Help para moderacion: algunas comunidades prohiben promocion; otras aplican la regla 10% autopromo / 90% contenido organico.
- Discord Community: Server Insights ayuda a medir engagement y salud de comunidad cuando el servidor crece.
- PostHog: las metricas de activacion deben correlacionarse con retencion y conviene capturarlas server-side cuando son criticas.
- Product Hunt Help: launch publico queda para mas adelante; los makers deben estar listos para interactuar directamente con la comunidad.

---

## Principio Final

No necesitamos demostrar que Covenant puede atraer trafico. Necesitamos demostrar que el loop hace que una persona vuelva.

Primero: **20 usuarios que cierren la Beta Quest.**
Despues: **50 usuarios activados.**
Solo entonces: **campana publica.**

La guerra no empieza con un ejercito. Empieza con la primera patrulla que vuelve del frente y dice: "esto funciona".
