# 🎯 Actividades

Las actividades en la aplicación web son **comunitarias** — objetivos compartidos por todos los jugadores de una facción.

## Sistema de Actividades Comunitarias

### Concepto

El mapa muestra **puntos de actividad** donde los jugadores pueden contribuir a objetivos colectivos.

- Cada jugador combate de forma independiente (1 vs n enemigos)
- Las victorias individuales suman al progreso global
- Las actividades tienen fecha límite en tiempo real
- El resultado (éxito/fracaso) afecta el estado del mapa

### Estructura de una Actividad

| Campo                      | Descripción                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| **Nombre**                 | Título de la actividad                                            |
| **Ubicación**              | Punto en el mapa donde ocurre                                     |
| **Objetivo**               | Meta colectiva (ej: derrotar 1000 demonios)                       |
| **Progreso**               | Contador global (suma de contribuciones)                          |
| **Fecha límite**           | Tiempo real hasta que expire                                      |
| **Recompensa individual**  | Oro por enemigo derrotado                                         |
| **Recompensa comunitaria** | Bonus al completar el objetivo                                    |
| **Consecuencia de fallo**  | Cambio en el mapa/narrativa. Eso no es visible para los usuarios. |

### Recompensas Especiales (Futuro)

Los jugadores con mayor contribución pueden recibir:

- **Títulos** — Reconocimiento visible (ej: "Matademonios")
- **Items únicos** — Equipo exclusivo del evento (ej: "Exterminador de Plagas")

### Escalado Dinámico de Objetivos

Los objetivos de cada actividad se calculan dinámicamente según la base de jugadores:

**Fórmula**: `Objetivo = Base + (Jugadores_Activos × Factor_Dificultad)`

| Dificultad | Factor | Ejemplo (10 jugadores) | Ejemplo (100 jugadores) |
| ---------- | ------ | ---------------------- | ----------------------- |
| Fácil      | ×10    | 150 enemigos           | 1,050 enemigos          |
| Normal     | ×15    | 200 enemigos           | 1,550 enemigos          |
| Difícil    | ×25    | 300 enemigos           | 2,550 enemigos          |

> **Base mínima**: 50 enemigos (garantiza contenido incluso con pocos jugadores)

**Definiciones:**

- **Jugadores Activos** = usuarios que han completado al menos 1 combate en los últimos 7 días.
- El objetivo se fija al **inicio** de la actividad y no cambia durante su duración (a no ser que sea necesario un balanceo).
- Los objetivos mostrados en las actividades son ejemplos para ~60 jugadores activos.

---

## 🔥 Evento Actual: Asedio de Santa Cruz (666 d.C.)

> _Los Seis Poderes Infernales han lanzado un ataque relámpago a Santa Cruz, la Sede Plateada. La Orden de los Caballeros Sagrados defiende cada muralla mientras los refuerzos vienen en camino. Si cae la Sede Plateada, cae el liderazgo de los Fieles._

### Mapa de Santa Cruz

```
                         N
                         ↑
            ┌────────────┴────────────┐
            │     🛡️ PUERTA NORTE     │
            └────────────┬────────────┘
                         │
   ┌──────────┐    ┌─────┴─────┐    ┌──────────┐
   │ ⚓       │    │  ⛪       │    │          │
 ←─┤ MUELLES  ├────┤ CATEDRAL  ├────┤  (Este)  ├─→
   │ (Costa)  │    │           │    │          │
   └──────────┘    └─────┬─────┘    └──────────┘
                         │
                ┌────────┴────────┐
                │  🔬 CATACUMBAS  │
                │   (Bloqueado)   │
                └────────┬────────┘
                         │
            ┌────────────┴────────────┐
            │    🏰 MURALLA SUR       │
            └────────────┬────────────┘
                         ↓
                         S
```

---

### Actividades Disponibles

#### 🛡️ Defender la Puerta del Norte

> La horda demoníaca se agolpa contra los portones de acero forjado. Sus aullidos resuenan entre las piedras mientras las bisagras crujen bajo el peso de mil garras. Los exploradores reportan movimiento en las catacumbas — si la puerta cae, no habrá forma de contener lo que emerja desde abajo.

| Campo                      | Valor                            |
| -------------------------- | -------------------------------- |
| **Facción**                | Orden de los Caballeros Sagrados |
| **Objetivo**               | Derrotar demonios                |
| **Enemigos**               | Demonios menores, Demonios élite |
| **Recompensa por enemigo** | 15 oro                           |
| **Fecha límite**           | 1 mes                            |

**Texto de éxito:** ¡Los demonios se retiran! La puerta aguanta. Santa Cruz sigue en pie... por ahora (ง'̀-'́)ง

**Si se completa:**

- Se desbloquea "Investigar Catacumbas"
- Bonus de 500 oro a todos los participantes

**Texto de fracaso:** Los regalos eran garras. Las garras eran mortales. La puerta ya no existe (╯°□°)╯︵ ┻━┻

**Si falla:**

- La puerta es destruida
- Nueva actividad de emergencia: "Evacuar el Primer Nivel"

---

#### ⚓ Asalto a los Navíos

> Una flota de navíos de velas negras bloquea el puerto. Los barcos de suministros de Trinidad esperan en el horizonte, pero no pueden atracar mientras las tropas demoníacas asedian los muelles. Sin esos refuerzos, la muralla sur no aguantará mucho más. El tiempo corre — cada día que pasa, más defensores caen sin provisiones ni medicina.

| Campo                      | Valor                            |
| -------------------------- | -------------------------------- |
| **Facción**                | Orden de los Caballeros Sagrados |
| **Objetivo**               | Destruir piratas y demonios      |
| **Enemigos**               | Piratas , Demonios menores       |
| **Recompensa por enemigo** | 15 oro                           |
| **Fecha límite**           | 2 semanas                        |

**Texto de éxito:** ¡Los enenigos se hunden con sus barcos! Que les den de comer a los peces ♪(´ε` )

**Si se completa:**

- Los refuerzos de Trinidad llegan
- Bonus de 600 oro a todos los participantes

**Texto de fracaso:** El mar se tiñe de rojo. Los barcos de Trinidad dan media vuelta. Estamos solos (；￣Д￣)

**Si falla:**

- Los refuerzos de Trinidad no llegan
- Se pierde una ruta de escape

---

#### 🏰 Defender la Muralla Sur

> Tres días sin dormir. Los cañones están al rojo vivo y la pólvora escasea. Desde lo alto de la muralla se ve el mar de sombras que se extiende hasta el horizonte — por cada demonio que cae, diez más toman su lugar. Si esta muralla cede, la ciudad quedará partida en dos. Los civiles del distrito sur no tendrán adónde huir.

| Campo                      | Valor                            |
| -------------------------- | -------------------------------- |
| **Facción**                | Orden de los Caballeros Sagrados |
| **Objetivo**               | Derrotar demonios                |
| **Enemigos**               | Demonios menores, Demonios élite |
| **Recompensa por enemigo** | 12 oro                           |
| **Fecha límite**           | 3 semanas                        |

**Texto de éxito:** ¡El sur está asegurado! Ahora huele a victoria... y un poco a azufre, pero sobre todo a victoria ᕙ(⇀‸↼‶)ᕗ

**Si se completa:**

- Flanco sur asegurado
- Bonus de 400 oro a todos los participantes

**Texto de fracaso:** La muralla cayó. Los gritos del distrito sur resuenan por toda la ciudad (눈\_눈)

**Si falla:**

- Brecha en la muralla sur
- Nueva actividad: "Contener la Brecha"

---

### Actividades Bloqueadas

#### 🔬 Investigar Catacumbas

> Los mapas antiguos muestran túneles que conectan la catedral con el puerto — rutas de escape construidas hace siglos por los primeros fundadores. Pero los planos están incompletos, y los pocos exploradores que han bajado hablan de susurros en la oscuridad. Si los demonios descubren estos pasadizos antes que nosotros, podrán atacar desde dentro de nuestras propias murallas.

| Campo                 | Valor                                    |
| --------------------- | ---------------------------------------- |
| **Requisito**         | Completar "Defender la Puerta del Norte" |
| **Facción**           | Orden de los Caballeros Sagrados         |
| **Objetivo**          | Explorar 10 sectores de catacumbas       |
| **Mecánica especial** | Combate + exploración                    |

---

## Tipos de Combate

El combate sigue siendo por turnos, 1 vs 1 contra enemigos.

| Estrategia           | Descripción                        | Builds favorecidos     |
| -------------------- | ---------------------------------- | ---------------------- |
| **Mixta**            | Enemigos con resistencias variadas | Equilibrados, híbridos |
| **Debilidad Física** | Enemigos con alta DEF mágica       | Guerreros, Paladines   |
| **Debilidad Mágica** | Enemigos con alta DEF física       | Magos, Clérigos        |

---

## Flujo del Jugador

1. **Ver mapa (en la sidebar)** — El jugador ve Santa Cruz con los puntos de actividad
2. **Elegir actividad** — Haciendo hover sobre la actividad, se muestra la descripción. Hace clic en una actividad disponible para unirse.
3. **Leer descripción** — Ve objetivo, progreso actual, tiempo restante
4. **Unirse** — Entra en la cola de combate
5. **Combatir** — Pelea 1v1 contra enemigos de esa actividad
6. **Contribuir** — Cada victoria suma al progreso global
7. **Cobrar** — Recibe oro por cada enemigo derrotado

---

## Actualización del Mapa

Al finalizar el período de una actividad:

1. Se evalúa si el objetivo fue completado
2. Se distribuyen recompensas comunitarias (si aplica)
3. Se actualiza el estado del mapa según el resultado
4. Se desbloquean o aparecen nuevas actividades

> _El mapa es un documento vivo que refleja las acciones de la comunidad._
