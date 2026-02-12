# Plan de Marketing ARQ - Beta Privada

> **"El arte supremo de la guerra es someter al enemigo sin luchar."** — Sun Tzu

> **Objetivo:** Conseguir 50-100 usuarios beta cualificados para testear las funcionalidades principales para antes de Junio 2026.

> **Presupuesto:** 200€/mes

> **Principio operativo:** No competimos en mercados saturados. Ocupamos el cuadrante vacío con disciplina, comunidad propia, y ejecución concentrada en 2 canales.

---

## Posicionamiento: El Cuadrante Vacío

> "Los guerreros victoriosos primero ganan y luego van a la guerra."

**ARQ no compite con Habitica, Forest o Todoist.** Ocupamos un territorio que ninguno de ellos puede defender: el "gamer disciplinado" que busca épica, no ternura.

### Análisis Competitivo

| Competidor         | Territorio                | Fortaleza                       | Debilidad Explotable                        |
| ------------------ | ------------------------- | ------------------------------- | ------------------------------------------- |
| **Habitica**       | Gamificación casual       | Comunidad establecida, gratuita | Estética "infantil", sin narrativa profunda |
| **Forest**         | Focus/Pomodoro            | Simple, visual                  | Sin RPG, sin comunidad, solitario           |
| **Finch**          | Wellness emocional        | Cute, accesible                 | Demasiado "soft", sin desafío               |
| **Todoist/Notion** | Productividad profesional | Potentes, establecidos          | Aburridos, "trabajo", sin alma              |

### Mapa del Mercado

```
┌─────────────────────────────────────────────────────────────┐
│                    MAPA DEL MERCADO                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   CASUAL ←────────────────────────────────────→ HARDCORE    │
│                                                             │
│   ↑ CUTE        [Forest]    [Finch]                        │
│   │                                                         │
│   │             [Habitica]                                  │
│   │                                                         │
│   │                              ★ ARQ ★                    │
│   │                         (TERRITORIO VACÍO)              │
│   │                                                         │
│   ↓ DARK                                                    │
│                                                             │
│   [Todoist/Notion están fuera del mapa - no gamifican]     │
└─────────────────────────────────────────────────────────────┘
```

**Insight:** El cuadrante "Dark Fantasy + Hardcore" está completamente vacío. No hay competidor que lo defienda. Entramos sin fricción.

---

## Priorización de Canales

La regla fundamental: **máximo 2 canales primarios en cualquier momento.** Un indie con 200€/mes no puede estar en 4+ canales y hacer cada uno bien. Es mejor dominar 2 que ser mediocre en 5.

### Ranking por Impacto / Coste

| Prioridad | Canal                          | Coste    | Por qué                                                      |
| --------- | ------------------------------ | -------- | ------------------------------------------------------------ |
| **#1**    | Discord propio + Email capture | 0€       | Comunidad propia, no dependes de algoritmos, retención alta  |
| **#2**    | Reddit + Twitter (auténtico)   | 0€       | Acceso a audiencia exacta, pero en terreno ajeno             |
| **#3**    | Contenido (1/semana calidad)   | 0€       | SEO y descubrimiento a medio plazo                           |
| **#4**    | Micro-influencer (1 bueno)     | 150€/mes | Amplificación puntual cuando hay producto sólido que mostrar |
| Opcional  | Eventos presenciales           | Tiempo   | Alto coste en tiempo, útil solo si hay eventos relevantes    |

**Canales primarios Fase Beta:** Discord (#1) + Reddit/Twitter (#2).
Todo lo demás es secundario hasta que estos dos estén funcionando.

---

## #1: Discord + Email — Tu Base de Operaciones

### Por qué Discord es el Canal #1

Discord es **el único canal que controlas completamente.** Reddit puede banearte, Twitter puede cambiar el algoritmo, un influencer puede cancelar. Tu Discord y tu lista de email son tuyos.

Para un producto de nicho gaming/dark fantasy, Discord es el habitat natural del público objetivo. No estás forzando a tu audiencia a un canal incómodo — ya viven ahí.

### Estructura del Discord

| Canal            | Propósito                                      |
| ---------------- | ---------------------------------------------- |
| `#announcements` | Updates del producto, parches, nuevas features |
| `#feedback`      | Canal principal de input de beta testers       |
| `#bug-reports`   | Reporte estructurado de bugs                   |
| `#general`       | Conversación libre, comunidad                  |
| `#lore`          | Discusión del mundo, narrativa, teorías        |
| `#builds`        | Compartir builds de personajes, estrategias    |
| `#off-topic`     | Mantener la comunidad humana                   |

### Tácticas para Hacer el Discord Vivo

- **Participación del fundador diaria:** Responder en 24h, compartir progreso, pedir opiniones reales
- **Building in public:** Screenshots de desarrollo, decisiones de diseño abiertas a votación
- **Roles con significado:** Beta Tester, Early Adopter, Bug Hunter — que se sientan parte del equipo
- **Weekly update post:** Cada viernes, qué se hizo esta semana, qué viene la próxima. Podría enviarse en una newsletter en el futuro.

### Email Capture y Funnel

El email es el seguro contra la caída de cualquier plataforma. Cada persona que entra al Discord o a la waitlist debe dejar un email.

**Funnel de captura:**

```
Landing page / Reddit post / Twitter
         ↓
   Waitlist signup (email)
         ↓
   Email de bienvenida + invitación Discord
         ↓
   Onboarding en Discord
         ↓
   Beta access cuando esté listo
```

**Secuencia de emails:**

| Email | Timing            | Contenido                                           |
| ----- | ----------------- | --------------------------------------------------- |
| #1    | Inmediato         | Bienvenida + link Discord + qué esperar             |
| #2    | +3 días           | La visión de ARQ: por qué existe, qué lo diferencia |
| #3    | +7 días           | Preview de gameplay / screenshots                   |
| #4    | Cuando hay acceso | Invitación a beta con instrucciones                 |

**Herramientas:** Zoho Mail (contratado). Para el funnel de 4 emails de la secuencia de bienvenida, usarías Zoho Campaigns (incluido en varios planes de Zoho):

1. Crear una lista de contactos - Una lista tipo "Waitlist ARQ" donde caen los suscriptores desde tu landing page.
2. Conectar el formulario de registro - Zoho Campaigns genera un formulario embebible o puedes usar su API para añadir contactos desde tu landing/Discord.
3. Crear un workflow de automatización (Zoho Campaigns > Automation > Workflows):
   - Trigger: "Cuando un contacto se une a la lista Waitlist ARQ"
   - Email #1 (inmediato): Bienvenida + link Discord + qué esperar
   - Wait 3 días
   - Email #2: La visión de ARQ
   - Wait 4 días
   - Email #3: Preview de gameplay / screenshots
   - Email #4: Se envía manualmente o con otro trigger cuando abran el acceso a beta

4. Diseñar los emails - Usa el editor drag & drop de Zoho. Mantén un diseño oscuro/dark fantasy consistente con la marca de ARQ.
5. Métricas - Zoho Campaigns te da open rate, click rate y unsubscribes por defecto, que cubren las métricas del plan.

Si tu plan de Zoho es solo Zoho Mail (correo corporativo) sin Campaigns, necesitarías contratar Zoho Campaigns aparte o usar Zoho ZeptoMail para emails transaccionales vía API.

### Métricas Discord + Email

| Métrica                 | Objetivo Semana 6 | Objetivo Semana 12 |
| ----------------------- | ----------------- | ------------------ |
| Miembros Discord        | 30                | 80                 |
| Miembros activos/semana | 15                | 40                 |
| Emails en lista         | 50                | 150                |
| Tasa apertura emails    | >40%              | >40%               |

---

## #2: Reddit + Twitter — Presencia Auténtica

> "Sé el primero en ocupar el terreno elevado."

### Principio Fundamental: Autenticidad, No Infiltración

El enfoque correcto en Reddit y Twitter es **ser un miembro genuino de la comunidad que también está construyendo algo.** No "infiltrarse", no tener una fase secreta de espionaje. La gente detecta el marketing disfrazado inmediatamente, y Reddit en particular lo castiga con dureza.

**Qué funciona:**

- Ser transparente: "Estoy construyendo X, esto es lo que aprendí"
- Aportar valor sin pedir nada: responder preguntas, compartir conocimiento
- Building in public: compartir progreso real, incluyendo fracasos
- Pedir feedback honesto, no validación

**Qué NO funciona (y hay que evitar):**

- Crear cuentas falsas o "de apoyo"
- Posts que parecen orgánicos pero son promoción encubierta
- Postear en r/habitica para "convertir descontentos"
- Cualquier cosa que te dé vergüenza si alguien descubre que es marketing

### Reddit: Subreddits Objetivo

| Subreddit      | Audiencia | Enfoque                                           |
| -------------- | --------- | ------------------------------------------------- |
| r/gamification | 15k       | Audiencia exacta, compartir learnings de producto |
| r/productivity | 2M        | Posts de alto valor sobre gamificación + hábitos  |
| r/IndieGaming  | 500k+     | Devlogs, arte, progreso de desarrollo             |
| r/ADHD         | 1.5M      | Contenido útil sobre sistemas de productividad    |

**Cadencia:** 2-3 participaciones por semana (comentarios valiosos + 1 post propio máximo).

### Twitter: Building in Public

Twitter es el mejor canal para "building in public" porque el formato favorece updates cortos y frecuentes.

**Tipos de contenido:**

| Tipo             | Frecuencia   | Ejemplo                                             |
| ---------------- | ------------ | --------------------------------------------------- |
| Devlog update    | 2x/semana    | "Esta semana implementé el sistema de facciones..." |
| Screenshot/GIF   | 1x/semana    | UI, animaciones, gameplay                           |
| Pregunta genuina | 1x/semana    | "¿Qué prefieren: XP por tareas o por rachas?"       |
| Hilo de insight  | 1x/2 semanas | Algo que aprendiste construyendo ARQ                |

**Regla 80/20:** 80% valor puro (insights, preguntas, compartir conocimiento), 20% mención directa de ARQ. Pero incluso el 20% debe ser interesante por sí mismo, no un "descarga mi app".

### Métricas Reddit + Twitter

| Métrica                      | Objetivo Semana 6 | Objetivo Semana 12 |
| ---------------------------- | ----------------- | ------------------ |
| Seguidores Twitter           | 100               | 300                |
| Impresiones/semana           | 5k                | 15k                |
| Clicks a landing/Discord     | 20/semana         | 50/semana          |
| Posts Reddit con >20 upvotes | 2                 | 5 acumulados       |

---

## #3: Contenido — 1 Pieza de Calidad por Semana

### Por qué 1 y No 4

Con recursos limitados, **1 pieza excelente por semana genera más impacto que 4 mediocres.** Un buen post en Reddit o un hilo en Twitter bien pensado llega más lejos que 4 posts genéricos que nadie comparte.

### Calendario Semanal

| Día           | Actividad                                              |
| ------------- | ------------------------------------------------------ |
| Lunes         | Elegir tema de la semana basado en lo que resonó antes |
| Martes-Jueves | Crear la pieza (post, hilo, video corto, devlog)       |
| Viernes       | Publicar + compartir en canales relevantes             |
| Weekend       | Responder comentarios, engagement con la comunidad     |

### Formatos que Funcionan para Indie Games / Productivity

| Formato                | Plataforma       | Ejemplo                                                 |
| ---------------------- | ---------------- | ------------------------------------------------------- |
| Devlog con screenshots | Reddit + Twitter | "Cómo diseñé el sistema de combate basado en hábitos"   |
| GIF/video corto (30s)  | Twitter + TikTok | Demo de una feature en acción                           |
| Hilo de decisiones     | Twitter          | "5 decisiones de diseño que tomé esta semana y por qué" |
| Post de valor          | Reddit           | Insight genuino sobre gamificación / productividad      |

---

## #4: Micro-Influencers — 1 Colaboración de Calidad

### Cambio de Enfoque: Calidad sobre Cantidad

En lugar de 3 micro-influencers a 50€ cada uno (que probablemente hagan un post genérico y se olviden), **invertir 150€ en 1 colaboración más profunda** con alguien que realmente conecte con el producto.

### Perfil del Influencer Ideal

| Criterio        | Requisito                                           |
| --------------- | --------------------------------------------------- |
| Seguidores      | 5k-50k (engagement real > alcance masivo)           |
| Nicho           | Gaming + productividad, o dark fantasy + lifestyle  |
| Engagement rate | >5%                                                 |
| Formato         | Video (YouTube/TikTok) o hilos Twitter              |
| Autenticidad    | Que use el producto de verdad, no un read de script |

### Estructura de Colaboración

```
1. Identificar candidato que ya hable de temas afines
2. Darle acceso beta real (no una demo limitada)
3. Dejarle usar el producto 1-2 semanas
4. Colaboración: review honesto, no script forzado
5. Presupuesto: 150€ por 1 pieza de contenido de calidad
```

### Timing

No gastar en influencers hasta tener **producto mostrable y comunidad base.** Un influencer enviando tráfico a un Discord vacío o un producto con bugs es dinero desperdiciado. Activar en Fase 3 del timeline.

---

## Mecanismo de Referral

### Sistema Integrado en el Producto

El mejor canal de adquisición a largo plazo es que los propios usuarios traigan a otros. Diseñar un sistema de referral que se integre con la narrativa del juego.

**Mecánica propuesta:**

| Elemento            | Implementación                                               |
| ------------------- | ------------------------------------------------------------ |
| Invitación          | "Recluta un aliado para tu facción" — link único por usuario |
| Incentivo invitador | XP bonus, item exclusivo, o título cosmético                 |
| Incentivo invitado  | Bonus de inicio (XP o item de bienvenida)                    |
| Tracking            | Dashboard para ver cuántos aliados has reclutado             |

**Importante:** El sistema de referral no sustituye al marketing — lo complementa. Funciona cuando ya tienes usuarios satisfechos. Implementar cuando haya al menos 30 usuarios activos.

---

## Timeline: 12 Semanas Realistas

### Fase 1: Infraestructura (Semanas 1-3)

**Objetivo:** Tener la base lista antes de buscar usuarios.

| Semana | Acción                                    | Resultado esperado                |
| ------ | ----------------------------------------- | --------------------------------- |
| S1     | Crear Discord con estructura de canales   | Servidor listo para recibir gente |
| S1     | Landing page con waitlist + email capture | Punto de entrada funcional        |
| S2     | Configurar email (bienvenida automática)  | Funnel básico operativo           |
| S2     | Crear cuentas Twitter y Reddit            | Presencia mínima establecida      |
| S3     | Primeros 3 posts "building in public"     | Contenido inicial publicado       |
| S3     | Identificar 10 subreddits/cuentas afines  | Mapa de dónde participar          |

### Fase 2: Presencia y Comunidad (Semanas 4-7)

**Objetivo:** Construir presencia auténtica y primeros miembros de comunidad.

| Semana | Acción                                       | Resultado esperado                |
| ------ | -------------------------------------------- | --------------------------------- |
| S4-S5  | Participar activamente en Reddit (3x/semana) | Reputación en comunidades clave   |
| S4-S5  | Twitter: devlogs 2x/semana                   | Primeros seguidores orgánicos     |
| S6     | Primer post propio en Reddit con substance   | 20+ upvotes, primeros signups     |
| S6-S7  | Contenido semanal de calidad (1/semana)      | Pipeline de contenido establecido |
| S7     | Invitar primeros 10-15 beta testers          | Discord con vida real             |

### Fase 3: Amplificación (Semanas 8-10)

**Objetivo:** Escalar lo que funciona con apoyo de presupuesto.

| Semana | Acción                                     | Resultado esperado                   |
| ------ | ------------------------------------------ | ------------------------------------ |
| S8     | Activar colaboración con micro-influencer  | Amplificación de alcance             |
| S8-S9  | Push de contenido en canales que funcionan | Duplicar esfuerzo donde hay tracción |
| S9-S10 | Activar sistema de referral                | Crecimiento orgánico comienza        |

### Fase 4: Evaluación y Ajuste (Semanas 11-12)

**Objetivo:** Medir resultados, cortar lo que no funciona, reforzar lo que sí.

| Semana | Acción                                      | Resultado esperado          |
| ------ | ------------------------------------------- | --------------------------- |
| S11    | Análisis completo de métricas por canal     | Saber qué funciona y qué no |
| S11    | Encuesta a beta testers (NPS + feedback)    | Datos cualitativos reales   |
| S12    | Doblar inversión en canales ganadores       | Recursos concentrados       |
| S12    | Eliminar canales con bajo retorno           | Menos dispersión            |
| S12    | Documentar aprendizajes para siguiente fase | Base para el plan post-beta |

---

## Presupuesto: 200€/mes

> "No hay instancia de un país que se haya beneficiado de una guerra prolongada."

### Distribución Mensual

| Partida                     | Monto | Notas                                      |
| --------------------------- | ----- | ------------------------------------------ |
| Micro-influencer (1 bueno)  | 150€  | Activar en Fase 3, no antes                |
| Herramientas / contingencia | 50€   | Dominio, email tool si se necesita upgrade |

**Meses 1-2 (Fases 1-2):** Gastar ~0€. Todo el trabajo es orgánico: Discord, Reddit, Twitter, contenido.
**Mes 3 (Fase 3):** Activar los 200€ cuando haya producto y comunidad base.

### Distribución de Tiempo (10-12h/semana)

| Actividad                            | Horas | Prioridad |
| ------------------------------------ | ----- | --------- |
| Discord: participar + moderar        | 3-4h  | #1        |
| Reddit + Twitter: crear + participar | 3-4h  | #2        |
| Contenido semanal: crear + publicar  | 2-3h  | #3        |
| Gestión influencer + admin           | 1-2h  | #4        |

---

## Métricas y KPIs

### Dashboard Principal

| KPI                  | Objetivo S6 | Objetivo S12 | Cómo medirlo                |
| -------------------- | ----------- | ------------ | --------------------------- |
| Emails en waitlist   | 50          | 150          | Email tool dashboard        |
| Miembros Discord     | 30          | 80           | Discord server stats        |
| Beta testers activos | 15          | 50           | Analytics del producto      |
| Retention D7         | 40%         | 50%          | Mixpanel / analytics propio |
| NPS                  | >30         | >50          | Encuesta in-app o Discord   |

### Métricas por Canal

| Canal      | Métrica principal          | Objetivo S12  |
| ---------- | -------------------------- | ------------- |
| Discord    | Miembros activos/semana    | 40            |
| Email      | Tasa de apertura           | >40%          |
| Reddit     | Clicks a landing/Discord   | 50/semana     |
| Twitter    | Impresiones/semana         | 15k           |
| Influencer | Signups por colaboración   | 15+           |
| Referral   | Usuarios traídos por otros | 10% del total |

### Herramientas de Medición

| Herramienta          | Uso                              | Coste  |
| -------------------- | -------------------------------- | ------ |
| **Google Analytics** | Tráfico web, fuentes, conversión | Gratis |
| **Mixpanel**         | Comportamiento de usuarios       | Gratis |
| **UTM parameters**   | Atribución por canal y campaña   | Gratis |
| **Discord Insights** | Actividad del servidor           | Gratis |

---

## Los 6 Caminos a la Derrota (Y Cómo Evitarlos)

> "Conoce al enemigo y conócete a ti mismo; en cien batallas nunca estarás en peligro."

| Derrota              | Causa                              | Prevención                                      |
| -------------------- | ---------------------------------- | ----------------------------------------------- |
| **Dispersión**       | Estar en 5 canales a la vez        | Máximo 2 canales primarios hasta validar        |
| **Artificialidad**   | Marketing disfrazado de comunidad  | Autenticidad siempre, building in public real   |
| **Insubordinación**  | Mensajes inconsistentes            | Una voz, una narrativa, un posicionamiento      |
| **Ruina financiera** | Gastar antes de validar            | 0€ hasta tener tracción, luego 200€ con cuidado |
| **Colapso**          | Estrategia sin ejecución constante | Calendario semanal estricto, no "cuando pueda"  |
| **Impaciencia**      | Esperar resultados en 2 semanas    | 12 semanas mínimo, medir tendencias no picos    |

---

## Señales de Victoria

### Fase Beta Exitosa

| Métrica              | Target               |
| -------------------- | -------------------- |
| 50-100 usuarios beta | Masa crítica         |
| 50% retention D7     | Producto funciona    |
| NPS >50              | Usuarios satisfechos |
| 2 canales validados  | Marketing funciona   |

### Señales Cualitativas de que Va Bien

- Usuarios refiriendo amigos sin que se lo pidas
- Contenido compartido orgánicamente por usuarios
- Solicitudes de acceso beta que llegan sin promoción activa
- Conversaciones espontáneas en el Discord sin intervención del fundador
- Alguien escribe sobre ARQ sin que se lo hayas pedido

---

## Principio Final

> "La excelencia suprema consiste en romper la resistencia del enemigo sin luchar."

ARQ no compite. ARQ ocupa el vacío.

No luchamos contra Habitica por sus usuarios. Atraemos a los que Habitica nunca pudo satisfacer. No gastamos en ads compitiendo con Forest. Aparecemos donde Forest no existe. No intentamos ser mejores que Todoist. Somos algo completamente diferente.

La estrategia es simple: **construir una comunidad propia (Discord + Email), ser auténticos en comunidades ajenas (Reddit + Twitter), y concentrar recursos en lo que funciona.** Sin dispersión, sin artificialidad, sin prisa.

---

_Última actualización: 11 Febrero 2026_
