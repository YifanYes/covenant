# **Clases**

En la versión actual (Beta), las únicas clases disponibles son **Templario** y **Heraldo**.

_Regla de Selección:_ Un personaje puede equipar un máximo de **2 habilidades** en total, independientemente de su tier. Puede equipar una habilidad de un tier anterior. Solo puede tener una ultimate en total.

Los iconos de las habilidades hacen referencia a `arq/front/public/assets/abilities`.

## Tiers de Poder

Subir de tier desbloquea nuevas habilidades, permite adquirir ítems de mayor poder y permite enfrentarse a enemigos más poderosos.

### Juego de Mesa

|  Tier  | Requisito de Acceso            |
| :----: | :----------------------------- |
| **1**  | Tier Inicial                   |
| **2**  | Completar 2 misiones de Tier 1 |
| **3**  | Completar 3 misiones de Tier 2 |
| **4**  | Completar 3 misiones de Tier 3 |
| **5**  | Completar 4 misiones de Tier 4 |
| **6**  | Completar 4 misiones de Tier 5 |
| **7**  | Completar 5 misiones de Tier 6 |
| **8**  | Completar 5 misiones de Tier 7 |
| **9**  | Completar 5 misiones de Tier 8 |
| **10** | Completar 5 misiones de Tier 9 |

### App Web

En la app, el progreso se basa en **enemigos derrotados** de tu tier actual. Cada tier tiene un tipo de enemigo asociado:

|  Tier  | Tipo de Enemigo  | Requisito para Subir  |
| :----: | :--------------- | :-------------------- |
| **1**  | Minions          | Derrotar 50 enemigos  |
| **2**  | Élites           | Derrotar 75 enemigos  |
| **3**  | Capitanes        | Derrotar 100 enemigos |
| **4**  | Campeones        | Derrotar 125 enemigos |
| **5**  | Jefes menores    | Derrotar 150 enemigos |
| **6**  | Jefes            | Derrotar 175 enemigos |
| **7**  | Jefes mayores    | Derrotar 200 enemigos |
| **8**  | Archidemonio     | Derrotar 225 enemigos |
| **9**  | Señor del Abismo | Derrotar 250 enemigos |
| **10** | —                | Tier máximo           |

> **Nota:** Los valores de enemigos requeridos son provisionales y se ajustarán.

### Categorías de Habilidades

- **Básicas:** Habilidades de uso frecuente con costes de maná bajos o medios. Son el núcleo de la estrategia turno a turno.
- **Ultimate:** La técnica suprema de la rama. Tiene un coste de maná muy elevado y suele requerir un **Sacrificio**. Diseñada para cambiar el curso de la batalla en un solo turno.

### Tipos de habilidades

Las habilidades se dividen según su impacto mecánico en el juego:

- **Modificadores de Potencia:** Habilidades que añaden **Dados de Potencia** extras a la tirada de ataque o defensa. Son las más comunes y directas.
  - _Ejemplo: "+2 Dados de Potencia en el próximo ataque"._
- **Manipuladores de Umbral:** Alteran el número necesario para tener un éxito. Son extremadamente poderosas ya que aumentan la probabilidad de cada dado de forma individual.
  - _Ejemplo: "Reduce el Umbral de Fuerza (Ataque) en 1" (haciendo que un 3+ pase a ser un 2+)._
- **Habilidades de Crítico:** Habilidades que aseguran un 6 natural o que permiten que otros resultados (como un 5) cuenten como **Críticos** (ignorando la defensa normal).
- **Nulificación de Impactos:** En lugar de lanzar dados de defensa, estas habilidades anulan directamente un número fijo de **Impactos** recibidos.
- **Desplazamiento y Posicionamiento:** Habilidades que mueven al usuario o al enemigo una cantidad de casillas determinada, ignorando o provocando ataques de oportunidad.
  - _Tipos: Empuje, Tracción (Tirar hacia ti) o Teletransporte._
- **Daño Residual (DOTs):** Aplica estados que restan **Heridas** al inicio de cada turno (Fase de Efectos). Los más comunes son Quemadura, Purificado y Veneno.
- **Control de Masas (CC):** Habilidades que bloquean la capacidad de actuar del enemigo.
  - _Aturdido:_ Pierde su siguiente fase de acción.
  - _Inmovilizado:_ Su velocidad se reduce a 0.
- **Sustento y Recursos:** Habilidades que recuperan **Heridas** o **Maná**. Algunas pueden requerir un robo de vida (dañar para curar) o un sacrificio (perder vida para ganar maná).

### Efectos de Estado

| Efecto           | Descripción                                                               |
| :--------------- | :------------------------------------------------------------------------ |
| **Aturdido**     | Pierde su siguiente fase de acción.                                       |
| **Inmovilizado** | Su Velocidad se reduce a 0.                                               |
| **Quemadura**    | Sufre 1 Herida al inicio de cada turno. Los demonios son inmunes.         |
| **Purificado**   | Sufre 1 Herida de Luz Sagrada al inicio de cada turno. Afecta a demonios. |
| **Veneno**       | Sufre 2 Heridas al inicio de cada turno.                                  |

## ⚔️ Templario (Templar)

> "Buscaré la fuerza para aplastar el mal."

### Descripción

Un caballero con nervios de acero y coraje inquebrantable. Porta su armadura con orgullo y su arma con honor. Se especializa en ataque físico y defensa física.

Sus habilidades incluyen modificadores de potencia, manipuladores de umbral, desplazamiento y posicionamiento.

### Características

- **Rol:** Daño físico / Presión / Tanque Ofensivo.
- **Atributos Iniciales (Nivel 1):**
  - **Fuerza:** 4 / 4
  - **Magia:** 5 / 5
- **Progreso de Recursos:**
  - **Vida (Heridas):** `Base de Clase + (Tier * 2)` (Inicia en 8 en Tier 1).
  - **Maná:** `4 + Tier` (Inicia en 5 en Tier 1).
  - **Regeneración de Maná:** 1 (Recupera 1 de Maná al inicio de cada turno).

### Habilidades

#### Tier 1

**Forma**

- **Filo de la Luz**
  - Coste Maná: 3
  - Atributo: Luz
  - Icono: truth_blade
  - Mecánica: Aplica el estado **Purificado** al objetivo durante 2 turnos.
  - Descripción: Tu hoja se enciende con un resplandor dorado que abrasa la esencia oscura de cuanto toca.
  - Flavor text: _"Donde mi acero corta, la sombra se deshace."_

- **Protección Milagrosa**
  - Coste Maná: 3
  - Atributo: Luz
  - Icono: miraculous_protection
  - Mecánica: Anula 1 **Impactos** recibido en el turno actual.
  - Descripción: Clavas tus pies en el suelo y proyectas un aura protectora de luz sólida sobre tus compañeros.
  - Flavor text: _"Nadie cae mientras yo siga en pie."_

- **Embate de Acero**
  - Coste Maná: 3
  - Atributo: Metal
  - Icono: shield_bash
  - Mecánica: Un ataque físico que empuja al enemigo 1 casilla y le inflige -1 dado de Defensa hasta su próximo turno.
  - Descripción: Cargas con el escudo por delante, canalizando la resonancia metálica para convertir tu defensa en un arma contundente.
  - Flavor text: _"Mi escudo golpea más fuerte que tu espada."_

- **Corte Abrasador**
  - Coste Maná: 3
  - Atributo: Fuego
  - Icono: igneous_cut
  - Mecánica: Añade 1 dado extra de ataque. Aplica **Quemadura** durante 1 turno.
  - Descripción: Cubres tu hoja en un manto de llamas y cargas contra el enemigo.
  - Flavor text: _"El sol da vida, pero también la puede quitar."_

**Vacío**

- **Aceleración Entrópica**
  - Coste Maná: 3
  - Atributo: Fuego
  - Icono: flaming_apotheosis
  - Mecánica: El ataque aplica **Quemadura** (Sufre 1 Herida al inicio de sus siguientes 2 turnos) a un enemigo en una casilla adyacente.
  - Descripción: Aceleras la entropía del cuerpo del enemigo, haciéndolo estallar en llamas.
  - Flavor text: _"No alargues lo inevitable."_

- **Zornhau**
  - Coste Maná: 3
  - Atributo: Metal
  - Icono: reckless_strike
  - Mecánica: Suma +2 dados de **Potencia** al ataque, pero tu **Defensa** se reduce a 0 dados hasta tu próximo turno.
  - Descripción: Te lanzas hacia adelante con un grito de guerra, lanzando un corte maestro diagonal.
  - Flavor text: _"Atacar sin miedo es la única forma de vencer."_

- **Golpe de Marea**
  - Coste Maná: 2
  - Atributo: Agua
  - Icono: truth_blade
  - Mecánica: Suma +1 **Impacto** garantizado si el ataque tiene éxito.
  - Descripción: Lanzas una combinación de cortes, bailando como la marea en el océano.
  - Flavor text: _"El agua puede fluir, pero también puede pulverizar."_

- **Embestida Sísmica**
  - Coste Maná: 2
  - Atributo: Tierra
  - Icono: shoulder_charge
  - Mecánica: Ataca con +1 dado de Potencia. Si impactas, empuja 1 casilla.
  - Descripción: Canalizas la fuerza telúrica bajo tus pies y te lanzas como un terremoto viviente, arrastrando rocas y polvo a tu paso.
  - Flavor text: _"Donde yo piso, la tierra obedece."_

#### Tier 2

**Forma**

- **Escudo de Luz**
  - Coste Maná: 3
  - Atributo: Luz
  - Icono: light_shield
  - Mecánica: Reduce el **Umbral de Fuerza (Defensa)** en 1 (ej. de 3 a 2) hasta el siguiente turno.
  - Descripción: Conjuras una barrera de luz sólida que repele los ataques enemigos con un destello cegador.
  - Flavor text: _"Mi fe es mi escudo."_

- **Carga Relámpago**
  - Coste Maná: 4
  - Atributo: Rayo
  - Icono: righteous_charge
  - Mecánica: Ataca con +2 dados de Potencia. Si impactas, el enemigo queda **Aturdido**.
  - Descripción: Tu armadura irradia un resplandor cegador mientras te lanzas a la carga, dejando una estela luminosa tras de ti.
  - Flavor text: _"La sentencia se ha de ejecutar."_

- **Formación Inquebrantable**
  - Coste Maná: 4
  - Atributo: Tierra
  - Icono: unbreakable_formation
  - Mecánica: Durante 2 turnos, los enemigos no pueden acercarse a menos de 1 casilla de ti y reduces el daño recibido en 1 Herida (mínimo 1).
  - Descripción: Plantas los pies en la roca viva y el suelo se endurece a tu alrededor, creando un perímetro inamovible.
  - Flavor text: _"Ni un paso más. Aquí se quiebra vuestra ofensiva."_

- **Estallido**
  - Coste Maná: 4
  - Atributo: Fuego
  - Icono: combustion
  - Mecánica: Tu siguiente ataque inflige +2 dados de daño de Fuego. Si al menos 1 dados impacta, el enemigo sufre **Quemadura** durante 2 turnos.
  - Descripción: Canalizas el fuego en tu interior hasta que tu arma arde al rojo vivo, descargando toda esa energía en un golpe abrasador.
  - Flavor text: _"No hace falta gritar. El fuego habla por mí."_

**Vacío**

- **Puño Gigalítico**
  - Coste Maná: 3
  - Atributo: Tierra
  - Icono: precise_strike
  - Mecánica: El siguiente ataque considera los resultados de 5 y 6 como **Críticos** (ignorando defensa).
  - Descripción: Concentras la energía telúrica en un puño. Tu siguiente golpe encuentra la fractura perfecta en la defensa enemiga.
  - Flavor text: _"Un solo golpe en el lugar exacto vale más que cien al azar."_

- **Tajo Umbrío**
  - Coste Maná: 4
  - Atributo: Oscuridad
  - Icono: battle_fervor
  - Mecánica: Recuperas 1 **Herida** por cada Impacto causado en este ataque (Máximo 3).
  - Descripción: Una energía oscura y primitiva te recorre las venas: cada golpe que asestas te devuelve vitalidad robada al enemigo.
  - Flavor text: _"Su dolor es mi aliento. Su sangre, mi remedio."_

- **Meteoimpacto**
  - Coste Maná: 4
  - Atributo: Metal
  - Icono: audacity
  - Mecánica: Tu defensa física se reduce a 0, pero obtienes +2 dados de **Potencia**. Por cada 1, recibes 1 Herida.
  - Descripción: Abandonas toda postura defensiva y canalizas tu armadura metálica en puro poder ofensivo, arriesgándolo todo en cada golpe.
  - Flavor text: _"La mejor defensa es no necesitarla."_

- **Vendaval Despedazante**
  - Coste Maná: 5
  - Atributo: Aire
  - Icono: fan_cut
  - Mecánica: Ataca a todos los enemigos adyacentes con tu Fuerza actual y los empuja 1 casilla en dirección opuesta a ti.
  - Descripción: Desatas un torbellino de cuchillas de viento que siega y dispersa a todo enemigo a tu alrededor.
  - Flavor text: _"El viento no corta. Desgarra."_

#### Tier 3

**Forma**

- **Manto de Mareas (Ultimate)**
  - Coste Maná: 6
  - Atributo: Agua
  - Icono: nullify
  - Sacrificio: Tu Velocidad se reduce a 0 el siguiente turno.
  - Mecánica: Anula automáticamente todos los **Impactos** recibidos en este turno.
  - Descripción: Te envuelves en un torrente de agua viva que absorbe y disipa todo golpe antes de alcanzarte.
  - Flavor text: _"Golpea el océano si quieres. Él no sentirá nada."_

- **Espada del Rey (Ultimate)**
  - Coste Maná: 7
  - Atributo: Luz
  - Icono: kings_sword
  - Mecánica: Reduce el **Umbral de Fuerza (Ataque)** a 2+ para todos los dados lanzados este turno.
  - Descripción: Invocas la autoridad suprema del Rey de Reyes y tu espada resplandece con un fulgor dorado que no admite resistencia.
  - Flavor text: _"Cuando el rey desenvaina, el mundo se arrodilla."_

- **Martillo de la Ley**
  - Coste Maná: 6
  - Atributo: Metal
  - Icono: law_hammer
  - Mecánica: Realizas un ataque poderoso. Si causa al menos 1 herida, el objetivo queda **Aturdido** (Pierde su siguiente fase).
  - Descripción: Descargas un golpe devastador imbuido de la resonancia del metal puro, que resuena como un veredicto inapelable.
  - Flavor text: _"La justicia golpea una sola vez."_

- **Pira de Guerra**
  - Coste Maná: 7
  - Atributo: Fuego
  - Icono: combustion
  - Mecánica: Colocas una pira en tu casilla. Enemigos en casillas adyacentes (incluida la tuya) reciben 2 dados de daño de Fuego al inicio de cada turno durante 2 turnos.
  - Descripción: Invocas una columna de fuego que arde con furia sobre el campo de batalla, abrasando a todo enemigo que ose permanecer cerca.
  - Flavor text: _"El fuego no distingue cobardes de valientes. Solo cenizas."_

**Vacío**

- **Tormenta de Ruptura (Ultimate)**
  - Coste Maná: 6
  - Atributo: Aire
  - Icono: disruption_storm
  - Sacrificio: -1 Dado de Defensa hasta el próximo turno.
  - Mecánica: Lanza 4 dados de Potencia repartidos entre enemigos adyacentes.
  - Descripción: Invocas un torbellino de viento cortante que desgarra todo a tu alrededor, dispersando a los enemigos como hojas en la tempestad.
  - Flavor text: _"El viento no distingue entre armadura y carne."_

- **Enjambre de Truenos (Ultimate)**
  - Coste Maná: 8
  - Atributo: Rayo
  - Icono: lightning_burst
  - Sacrificio: Sufres 2 Heridas.
  - Mecánica: Todos los ataques de este turno aseguran un 6 natural (**Crítico automático**).
  - Descripción: La electricidad recorre tu cuerpo como un enjambre de relámpagos vivientes. Cada golpe descarga una corriente letal que encuentra el punto exacto donde hacer más daño.
  - Flavor text: _"Mil truenos en mis puños. Uno basta para acabar contigo."_

- **Represalia**
  - Coste Maná: 8
  - Atributo: Oscuridad
  - Icono: karmic_retribution
  - Mecánica: Durante 2 turnos, cualquier enemigo que te inflija daño recibe automáticamente 2 **Heridas** de retroceso.
  - Descripción: Una energía oscura envuelve tu cuerpo como un manto de espinas invisibles, devolviendo cada golpe con creces.
  - Flavor text: _"Cada herida que me inflijas será tuya también."_

- **Ejecución**
  - Coste Maná: 7
  - Atributo: Metal
  - Icono: summary_execution
  - Mecánica: Realiza un ataque letal a un enemigo (no Boss) que esté por debajo del 25% de su vida máxima. Si cumple la condición, el enemigo muere instantáneamente.
  - Descripción: Levantas tu arma y descargas un golpe final contra el enemigo debilitado, segando su vida con precisión de verdugo.
  - Flavor text: _"Tu sentencia ha sido dictada."_

## 🔮 Heraldo (Herald)

> "Buscaré la sabiduría para encontrar la luz."

### Descripción

Un erudito de las artes mágicas y las energías celestiales. Prefiere la distancia y la estrategia sobre la fuerza bruta, utilizando su vasto conocimiento para manipular la realidad. Se especializa en ataque mágico y defensa mágica.

Muchos de ellos eran antiguos sabios, eruditos, ingenieros y estrategas que respondieron al Llamado para proteger el saber sagrado frente a la destrucción demoníaca.

Sus habilidades incluyen control de masas, desplazamiento (teletransporte), manipulación de umbrales y daño residual.

### Características

- **Rol:** Daño Mágico / Control de Área (AoE).
- **Atributos Iniciales (Nivel 1):**
  - **Fuerza:** 5 / 5
  - **Magia:** 4 / 4
- **Progreso de Recursos:**
  - **Vida (Heridas):** `Base de Clase + (Tier * 2)` (Inicia en 5 en Tier 1).
  - **Maná:** `10 + Tier` (Inicia en 11 en Tier 1).
  - **Regeneración de Maná:** 2 (Recuperas 2 de Maná al inicio de cada turno).

### Habilidades

#### Tier 1

**Forma**

- **Petrificación**
  - Coste Maná: 3
  - Atributo: Tierra
  - Icono: temporal_prison
  - Mecánica: El objetivo queda **Inmovilizado** (Velocidad 0) durante su siguiente turno.
  - Descripción: Canalizas la energía telúrica para cristalizar los músculos del enemigo, convirtiéndolo en una estatua de roca viva.
  - Flavor text: _"La tierra reclama lo que le pertenece."_

- **Protección Milagrosa**
  - Coste Maná: 3
  - Atributo: Luz
  - Icono: miraculous_protection
  - Mecánica: Anula 1 **Impactos** recibido en el turno actual.
  - Descripción: Clavas tus pies en el suelo y proyectas un aura protectora de luz sólida sobre tus compañeros.
  - Flavor text: _"Nadie cae mientras yo siga en pie."_

- **Empuje Arcano**
  - Coste Maná: 2
  - Atributo: Aire
  - Icono: arcane_push
  - Mecánica: Empuja a un enemigo adyacente hasta 3 casillas.
  - Descripción: Liberas una ráfaga de viento arcano concentrado que lanza al enemigo por los aires con la fuerza de un huracán.
  - Flavor text: _"El aire no pide permiso para pasar."_

- **Malleus**
  - Coste Maná: 7
  - Atributo: Luz
  - Icono: unerring_dart
  - Mecánica: Destruye a un enemigo tipo demonio que no sea jefe.
  - Descripción: Materializas un proyectil de luz sagrada concentrada que persigue al enemigo hasta alcanzarlo, sin importar escudo ni distancia.
  - Flavor text: _"La luz siempre encuentra su destino."_

**Vacío**

- **Frío Polar**
  - Coste Maná: 4
  - Atributo: Hielo
  - Icono: frost_bite
  - Mecánica: Aplica **Congelación** al objetivo (pierde 2 dados de Potencia en su próximo turno).
  - Descripción: Drenas el calor vital del enemigo hasta que sus músculos se agarrotan y su voluntad se embota bajo una capa de escarcha.
  - Flavor text: _"El frío no mata rápido. Primero te roba la fuerza."_

- **Dracoaliento**
  - Coste Maná: 3
  - Atributo: Fuego
  - Icono: fireball
  - Mecánica: Suma +4 dados de **Potencia**. Si obtienes un 1 natural en cualquier dado, sufres 1 Herida de retroceso.
  - Descripción: Conjuras una esfera de fuego inestable entre tus manos y la arrojas al enemigo, donde detona con furia volcánica.
  - Flavor text: _"El fuego es generoso: siempre quiere compartirse."_

- **Estallido de Relámpagos**
  - Coste Maná: 3
  - Atributo: Rayo
  - Icono: lightning_burst
  - Mecánica: Otorga +2 dados de **Potencia** al siguiente habilidad de ataque.
  - Descripción: Una descarga súbita de energía eléctrica que salta de tus dedos buscando el metal del enemigo.
  - Flavor text: _"El relámpago no avisa, solo castiga."_

- **Paso Sombrío**
  - Coste Maná: 3
  - Atributo: Oscuridad
  - Icono: shadow_step
  - Mecánica: Te teletransportas hasta 2 casillas en cualquier dirección. Tu próximo ataque ignora la Defensa del enemigo.
  - Descripción: Te disuelves en las sombras y reapareces en otro punto del campo de batalla, envuelto en oscuridad residual que ciega al enemigo.
  - Flavor text: _"Las sombras no son ausencia de luz, son puertas."_

#### Tier 2

**Forma**

- **Ojo del Oráculo**
  - Coste Maná: 4
  - Atributo: Mente
  - Icono: oracle_eye
  - Mecánica: Reduce el **Umbral de Magia (Ataque)** en 1 para tu siguiente habilidad.
  - Descripción: Tu tercer ojo se abre y percibe las líneas de fuerza del enemigo, revelando los puntos exactos donde tu magia será más devastadora.
  - Flavor text: _"Veo tus debilidades como constelaciones en la oscuridad."_

- **Parpadeo Etéreo**
  - Coste Maná: 4
  - Atributo: Aire
  - Icono: blink
  - Mecánica: Teletransporte instantáneo hasta 4 casillas, ignorando obstáculos. No recibes ataques de oportunidad.
  - Descripción: Tu cuerpo se descompone en partículas de éter y se reensambla instantáneamente en otro punto, demasiado rápido para que el ojo lo siga.
  - Flavor text: _"Estaba allí, y ahora estoy aquí. ¿Demasiado lento?"_

- **Purificación Acuática**
  - Coste Maná: 4
  - Atributo: Agua
  - Icono: inspiration
  - Mecánica: Elimina todos los efectos de estado perjudiciales (Quemadura, Veneno, etc.) del usuario.
  - Descripción: Invocas corrientes de agua arcana que recorren tu cuerpo, arrastrando toda impureza y restaurando tu equilibrio elemental.
  - Flavor text: _"El agua limpia lo que el fuego no puede."_

- **Invocación Fractal**
  - Coste Maná: 5
  - Atributo: Luz
  - Icono: fractal_invocation
  - Mecánica: Crea copias ilusorias de ti mismo que absorben parte del daño. Anulas el 50% de los **Impactos** recibidos (redondeando hacia arriba).
  - Descripción: Fragmentas tu imagen en docenas de réplicas luminosas que confunden al enemigo, dispersando sus ataques entre espejismos.
  - Flavor text: _"¿Cuál de todos soy yo? Adivina antes de que sea tarde."_

**Vacío**

- **Voto de Silencio**
  - Coste Maná: 4
  - Atributo: Mente
  - Icono: silence_vortex
  - Mecánica: El objetivo queda **Aturdido** (Pierde su siguiente fase de acción).
  - Descripción: Impones tu voluntad sobre el flujo arcano del enemigo, sellando sus labios y su mente.
  - Flavor text: _"Tu blasfemia termina aquí."_

- **Transfusión**
  - Coste Maná: 5
  - Atributo: Oscuridad
  - Icono: transfusion
  - Mecánica: Sacrifica 2 **Heridas** para recuperar 6 de **Maná** instantáneamente.
  - Descripción: Abres pequeñas incisiones arcanas en tus brazos para que tu sangre se convierta en combustible mágico puro.
  - Flavor text: _"La magia fluye mejor cuando se mezcla con sangre."_

- **Lluvia de Fuego**
  - Coste Maná: 5
  - Atributo: Fuego
  - Icono: plasma_missile
  - Mecánica: Proyectil que explota en área 2x2. Todos los afectados reciben ataques con 3 dados. Los impactados sufren **Quemadura**.
  - Descripción: Invocas una andanada de proyectiles de plasma ardiente que caen del cielo y detonan al impacto, incendiando todo a su paso.
  - Flavor text: _"El cielo se tiñe de rojo antes de la devastación."_

- **Cuchilla de Viento**
  - Coste Maná: 4
  - Atributo: Aire
  - Icono: arcane_push
  - Mecánica: Ataque a distancia 4 con +3 dados de **Potencia**. Ignora cobertura.
  - Descripción: Comprimes el aire en una hoja invisible y la lanzas a gran velocidad, cortando sin que el enemigo vea venir el golpe.
  - Flavor text: _"El viento corta lo que el acero no alcanza."_

#### Tier 3

**Forma**

- **Aurora del Juicio (Ultimate)**
  - Coste Maná: 9
  - Atributo: Luz
  - Icono: judgment_aurora
  - Sacrificio: No puedes moverte este turno.
  - Mecánica: Todos los dados de esta habilidad que obtengan un éxito cuentan como **Críticos**.
  - Descripción: El cielo se abre para liberar una columna de luz pura que desintegra cualquier rastro de oscuridad.
  - Flavor text: _"La luz no deja sombras donde esconderse."_

- **Maelstrom (Ultimate)**
  - Coste Maná: 9
  - Atributo: Agua
  - Icono: silence_vortex
  - Sacrificio: Pierdes 4 de Maná al inicio de tus próximos 2 turnos.
  - Mecánica: Atacas con 5 dados a los enemigos en un área 3x3 y quedan **Aturdidos** (Pierden su siguiente fase).
  - Descripción: Un vórtice de agua descomunal surge del suelo y engulle a todos los enemigos, arrastrándolos en un torbellino imparable que los golpea y los deja sin capacidad de reacción.
  - Flavor text: _"El mar no perdona, y tampoco olvida."_

- **Electrocañón**
  - Coste Maná: 6
  - Atributo: Rayo
  - Icono: lightning_burst
  - Mecánica: Lanza 7 dados extra de **Potencia** contra un único objetivo. Si impacta, queda **Inmovilizado** (Velocidad 0) durante 2 turnos.
  - Descripción: Concentras una descarga eléctrica devastadora en un solo punto, paralizando los músculos del objetivo con una corriente que lo atraviesa de lado a lado.
  - Flavor text: _"Un rayo no necesita segundo impacto."_

- **Replicación Perfecta**
  - Coste Maná: 6
  - Atributo: Mente
  - Icono: fractal_invocation
  - Mecánica: Obtienes +2 dados de **Potencia** por cada Tier del enemigo objetivo (Tier 1=+2, Tier 2=+4, Tier 3=+6).
  - Descripción: Tu mente absorbe y replica los patrones arcanos del enemigo, volviéndolos en su contra con una potencia proporcional a su propio poder.
  - Flavor text: _"Cuanto más fuerte seas, más fuerte me haces a mí."_

**Vacío**

- **Colapso Estelar (Ultimate)**
  - Coste Maná: 10
  - Atributo: Oscuridad
  - Icono: stellar_collapse
  - Sacrificio: Tu Defensa se reduce a 0 hasta el siguiente turno.
  - Mecánica: Lanza 10 dados de **Potencia**. Cada resultado de 6 genera un impacto adicional.
  - Descripción: Invocas la muerte de una estrella en miniatura: una implosión de energía oscura que aplasta todo a su alrededor con fuerza gravitatoria descomunal.
  - Flavor text: _"Así mueren las estrellas. Así morirás tú."_

- **Agujero Negro (Ultimate)**
  - Coste Maná: 10
  - Atributo: Oscuridad
  - Icono: black_hole
  - Mecánica: Atrae a todos los enemigos en radio 5 hacia el centro. Los enemigos atraídos quedan **Aturdidos** y sufren 2 Heridas.
  - Descripción: Abres una singularidad de vacío puro que devora la luz y arrastra a todo ser cercano hacia su centro insaciable.
  - Flavor text: _"Nada escapa. Ni la luz, ni la esperanza."_

- **Represalia**
  - Coste Maná: 8
  - Atributo: Oscuridad
  - Icono: karmic_retribution
  - Mecánica: Durante 2 turnos, cualquier enemigo que te inflija daño recibe automáticamente 2 **Heridas** de retroceso.
  - Descripción: Una energía oscura envuelve tu cuerpo como un manto de espinas invisibles, devolviendo cada golpe con creces.
  - Flavor text: _"Cada herida que me inflijas será tuya también."_

- **Desintegración Atómica**
  - Coste Maná: 8
  - Atributo: Oscuridad
  - Icono: disintegration_ray
  - Mecánica: Destruyes a un enemigo que no sea jefe.
  - Descripción: Disuelves los enlaces fundamentales que mantienen unido al objetivo, descomponiendo su materia en partículas inertes que se desvanecen como ceniza negra.
  - Flavor text: _"No te destruyo. Te devuelvo al polvo que siempre fuiste."_

## ⚖️ Inquisidor, Llama de la Verdad (Inquisitor)

> "El fuego no solo quema, también purifica."

### Descripción

Un ejecutor implacable que fusiona la devoción marcial con el fuego purificador. Porta armadura pesada y no duda en entrar en el fragor de la batalla para detonar explosiones mágicas a corta distancia. Se especializa en ataque mágico y defensa física.

Son jueces y verdugos, encargados de erradicar la corrupción allí donde se esconda, sea en la carne o en el espíritu.

Sus habilidades incluyen modificadores de potencia, control de masas, efectos de quemadura y protección divina.

> **Tipo de Daño:** Las habilidades del Inquisidor infligen daño de **Luz Sagrada**. Esto les permite dañar efectivamente a los demonios, naturalmente resistentes al fuego.

### Características

- **Rol:** Tanque Mágico / Daño Híbrido.
- **Atributos Iniciales (Nivel 1):**
  - **Fuerza:** 5 / 4
  - **Magia:** 4 / 5
- **Progreso de Recursos:**
  - **Vida (Heridas):** 8
  - **Maná:** `6 + Tier` (Inicia en 7 en Tier 1).
  - **Regeneración de Maná:** 2 (Recuperas 2 de Maná al inicio de cada turno).

### Habilidades

#### Tier 1

**Forma**

- **Sentencia de Hierro**
  - Coste Maná: 3
  - Atributo: Metal
  - Icono: law_hammer
  - Mecánica: Tu siguiente habilidad de **Ataque** suma +1 dado de **Potencia**. Si el objetivo es un ser de oscuridad o demonio, suma +2 dados.
  - Descripción: Levantas tu arma y la imbuyes con la resonancia del metal puro, dictando un veredicto de hierro antes de golpear.
  - Flavor text: _"La ley es pesada, pero el metal más."_

- **Luz Devoradora**
  - Coste Maná: 4
  - Atributo: Luz
  - Icono: disintegration_ray
  - Mecánica: Destruye instantáneamente a un enemigo pequeño (Rango: Masilla) de tipo demonio o ángel caído.
  - Descripción: Concentras la luz en un punto crítico de la esencia oscura del enemigo, desintegrándolo por completo.
  - Flavor text: _"La oscuridad no puede existir donde hay suficiente luz."_

- **Interrogatorio Fervoroso**
  - Coste Maná: 3
  - Atributo: Fuego
  - Icono: battle_fervor
  - Mecánica: Realizas un ataque imbuido en fuego sagrado. Si obtienes al menos 2 éxitos, el enemigo queda **Aturdido** (pierde su fase de acción).
  - Descripción: Tu arma arde con llamas purificadoras mientras interrogas al enemigo con cada golpe.
  - Flavor text: _"El dolor suelta la lengua... y el arma."_

- **Fe Blindada**
  - Coste Maná: 3
  - Atributo: Metal
  - Icono: iron_bastion
  - Mecánica: Tu armadura resplandece, otorgándote +2 dados de **Defensa Física** hasta tu próximo turno.
  - Descripción: Canalizas energía metálica a través de tu armadura, endureciéndola hasta volverla prácticamente impenetrable.
  - Flavor text: _"Mi voluntad es más dura que vuestro acero."_

**Vacío**

- **Martillo Radiante**
  - Coste Maná: 3
  - Atributo: Luz
  - Icono: law_hammer
  - Mecánica: Un ataque fulminante que suma +2 dados de **Potencia**. Si impacta, aplica **Purificado** al objetivo.
  - Descripción: Tu arma se rodea de un fulgor radiante que purifica la carne al contacto.
  - Flavor text: _"La corrupción arde ante el impacto de la luz."_

- **Círculo Purificador**
  - Coste Maná: 3
  - Atributo: Luz
  - Icono: combustion
  - Mecánica: Crea un área de luz divina en tu posición. Enemigos adyacentes sufren 1 Herida de Luz Sagrada al inicio de cada turno durante 2 turnos.
  - Descripción: Trazas un círculo ardiente de luz pura en el suelo que irradia energía purificadora en todas las direcciones.
  - Flavor text: _"Aquí solo queda el polvo de los impuros."_

- **Embestida Radiante**
  - Coste Maná: 3
  - Atributo: Luz
  - Icono: righteous_charge
  - Mecánica: Desplázate en línea recta hasta 3 casillas y ataca al primer enemigo con +2 dados de Potencia. Si impactas, aplica **Purificado**.
  - Descripción: Te lanzas envuelto en una coraza de luz cegadora, detonando al impacto contra el enemigo.
  - Flavor text: _"Soy la mecha y la bomba."_

- **Marca del Hereje**
  - Coste Maná: 2
  - Atributo: Luz
  - Icono: fragility_curse
  - Mecánica: Marcas a un enemigo. Ese enemigo recibe +1 Herida de daño extra cada vez que sufra daño por **Luz Sagrada**.
  - Descripción: Grabas un símbolo ardiente en la esencia del enemigo que amplifica cada impacto de luz que reciba.
  - Flavor text: _"Estás señalado para la hoguera."_

#### Tier 2

**Forma**

- **Voto de Silencio**
  - Coste Maná: 4
  - Atributo: Mente
  - Icono: silence_vortex
  - Mecánica: El objetivo queda **Aturdido** (Pierde su siguiente fase de acción).
  - Descripción: Impones tu voluntad sobre el flujo arcano del enemigo, sellando sus labios y su mente.
  - Flavor text: _"Tu blasfemia termina aquí."_

- **Muro de Incienso**
  - Coste Maná: 4
  - Atributo: Aire
  - Icono: mana_barrier
  - Mecánica: Los enemigos no pueden realizar ataques de oportunidad contra ti este turno y tu **Defensa Mágica** aumenta en +2 dados.
  - Descripción: Una densa nube de humo arcano te rodea, confundiendo los sentidos de los enemigos y desviando sus conjuros.
  - Flavor text: _"Caminad entre la bruma y no seréis vistos."_

- **Cadenas de Luz**
  - Coste Maná: 4
  - Atributo: Luz
  - Icono: temporal_prison
  - Mecánica: Un enemigo a distancia 3 queda **Inmovilizado** (Velocidad 0) y pierde -1 dado de Defensa.
  - Descripción: Conjuras grilletes de luz sólida que inmovilizan al enemigo y debilitan su capacidad de resistir.
  - Flavor text: _"La luz no solo ilumina, también aprisiona."_

- **Purificación Acuática**
  - Coste Maná: 4
  - Atributo: Agua
  - Icono: inspiration
  - Mecánica: Elimina todos los efectos de estado perjudiciales (Quemadura, Veneno, etc.) del usuario.
  - Descripción: Invocas corrientes de agua arcana que recorren tu cuerpo, arrastrando toda impureza y restaurando tu equilibrio elemental.
  - Flavor text: _"El agua limpia lo que el fuego no puede."_

**Vacío**

- **Iluminación del Alma**
  - Coste Maná: 5
  - Atributo: Luz
  - Icono: wrath_avatar
  - Sacrificio: Pierdes 1 Herida.
  - Mecánica: Tu siguiente **Ataque** suma +4 dados de **Potencia** y causa daño de **Luz Sagrada**.
  - Descripción: Conviertes tu propio dolor físico en una llamarada luminosa que duplica la fuerza de tu golpe.
  - Flavor text: _"Que mi carne sea el combustible de su perdición."_

- **Estallido Radiante**
  - Coste Maná: 4
  - Atributo: Fuego
  - Icono: fireball
  - Mecánica: Lanza 3 dados de Potencia a todos los enemigos adyacentes.
  - Descripción: Detonas una onda expansiva de fuego radiante que abrasa a todo enemigo a tu alrededor.
  - Flavor text: _"¡Arded en la luz!"_

- **Duelo de Honor**
  - Coste Maná: 5
  - Atributo: Luz
  - Icono: challenge
  - Mecánica: Seleccionas a un enemigo. Hasta tu próximo turno, ganas +3 dados de **Potencia** contra él.
  - Descripción: Señalas a un enemigo y lo desafías a un combate singular, canalizando toda tu luz contra él.
  - Flavor text: _"Tú y yo. Nadie más importa."_

- **Llamarada Solar**
  - Coste Maná: 5
  - Atributo: Fuego
  - Icono: combustion
  - Mecánica: Purificas el terreno en área 3x3. Los enemigos en el área sufren 2 Heridas ignorando bonificadores de Defensa. Se destruye cobertura y terreno difícil.
  - Descripción: Desatas una oleada de fuego purificador que arrasa el terreno, destruyendo toda cobertura y calcinando a los enemigos ocultos.
  - Flavor text: _"No hay refugio para los corruptos."_

#### Tier 3

**Forma**

- **Juicio Final (Ultimate)**
  - Coste Maná: 8
  - Atributo: Luz
  - Icono: judgment_aurora
  - Sacrificio: Tu Velocidad se reduce a 0 este turno.
  - Mecánica: Todos los enemigos en un radio de 3 casillas sufren 2 **Impactos** directos y quedan **Aturdidos**.
  - Descripción: El cielo se torna rojo mientras una lluvia de espadas de luz desciende sobre el campo de batalla.
  - Flavor text: _"Nadie es inocente ante mis ojos."_

- **Exorcismo Mayor**
  - Coste Maná: 7
  - Atributo: Luz
  - Icono: disintegration_ray
  - Mecánica: Inflige daño masivo (8 dados) a un solo objetivo si es Demonio o No-muerto. Si lo elimina, recuperas 2 Heridas.
  - Descripción: Concentras un torrente de luz desintegradora contra la esencia oscura de un demonio o no-muerto, purificándolo por completo.
  - Flavor text: _"Vuelve al abismo del que reptaste."_

- **Escudo de la Verdad**
  - Coste Maná: 6
  - Atributo: Luz
  - Icono: light_shield
  - Mecánica: Durante 2 turnos, tú y tus aliados adyacentes sois inmunes a estados alterados (Veneno, Quemadura, Purificado).
  - Descripción: Generas un campo de luz inmaculada que repele toda corrupción y estado alterado de quienes estén a tu lado.
  - Flavor text: _"La pureza repele la corrupción."_

- **Represalia**
  - Coste Maná: 8
  - Atributo: Oscuridad
  - Icono: karmic_retribution
  - Mecánica: Durante 2 turnos, cualquier enemigo que te inflija daño recibe automáticamente 2 **Heridas** de retroceso.
  - Descripción: Una energía oscura envuelve tu cuerpo como un manto de espinas invisibles, devolviendo cada golpe con creces.
  - Flavor text: _"Cada herida que me inflijas será tuya también."_

**Vacío (Luz Sagrada)**

- **Pira Funeraria (Ultimate)**
  - Coste Maná: 9
  - Atributo: Luz
  - Icono: flaming_apotheosis
  - Sacrificio: Pierdes 3 Heridas.
  - Mecánica: Todos los enemigos en escena reciben **Purificado** permanentemente.
  - Descripción: Canalizas la mismísima Luz del Señor, consumiéndote en un éxtasis de luz para borrar toda mácula del campo de batalla.
  - Flavor text: _"Que el universo entero sea testigo de mi devoción."_

- **Látigo de Luz**
  - Coste Maná: 7
  - Atributo: Luz
  - Icono: disintegration_ray
  - Mecánica: Atacas a un enemigo a distancia 3 con +3 dados de Potencia. Si impactas, atraes al enemigo hacia ti y aplicas **Aturdido**.
  - Descripción: Proyectas un tentáculo de luz concentrada que atrapa al enemigo y lo arrastra hacia ti, purificándolo en el proceso.
  - Flavor text: _"Ven aquí, escoria."_

- **Anillo ígneo**
  - Coste Maná: 8
  - Atributo: Fuego
  - Icono: fireball
  - Mecánica: Si matas a un enemigo, su cuerpo explota causando 4 Heridas a enemigos adyacentes.
  - Descripción: Imbuyes al enemigo moribundo con energía ígnea inestable que detona al morir, arrastrando a sus aliados en la explosión.
  - Flavor text: _"Su muerte será el preludio de la vuestra."_

- **Consumo de la Carne**
  - Coste Maná: 6
  - Atributo: Luz
  - Icono: inspiration
  - Mecánica: Recuperas 1 Herida por cada enemigo que sufra daño de **Luz Sagrada** durante tu turno.
  - Descripción: La energía de luz que inflijes a tus enemigos fluye de vuelta hacia ti, sanando tus heridas con cada impacto.
  - Flavor text: _"La luz alimenta, la luz sana."_

## 🏹 Cazademonios (Demon Hunter)

> "Sin misericordia. Sin prisioneros. Sin rendición. Matadlos a todos."

### Descripción

Un cazador insaciable impulsado por un odio inextinguible hacia lo abisal. Utiliza tácticas de guerrilla, trampas y munición especializada para cazar a sus presas. Se especializa en daño físico y defensa mágica (las debilidades de los demonios).

Este grupo está formado por aquellas personas cuyas ciudades fueron arrasadas por los demonios. Su odio y su sed de venganza les ciega, buscando la aniquilación total de la estirpe demoníaca.

Sus habilidades incluyen críticos asegurados, estados alterados (sangrado y veneno), trampas de control y alta movilidad.

### Características

- **Rol:** Asesino de Demonios / Glass Cannon Físico.
- **Atributos Iniciales (Nivel 1):**
  - **Fuerza:** 4 / 5
  - **Magia:** 5 / 4
- **Progreso de Recursos:**
  - **Vida (Heridas):** 6
  - **Maná:** `6 + Tier` (Inicia en 7 en Tier 1).
  - **Regeneración de Maná:** 1 (Recuperas 1 de Maná al inicio de cada turno).

### Habilidades

#### Tier 1

**Forma (Táctica y Supervivencia)**

- **Capa de Sombras**
  - Coste Maná: 3
  - Atributo: Oscuridad
  - Icono: shadow_step
  - Mecánica: Anula los primeros 2 **Impactos** de origen mágico recibidos.
  - Descripción: Te desvaneces en la penumbra, volviéndote una sombra entre las sombras, inalcanzable para la magia.
  - Flavor text: _"Me muevo entre los susurros del abismo."_

- **Trampa Telúrica**
  - Coste Maná: 3
  - Atributo: Tierra
  - Icono: nullify
  - Mecánica: Crea una trampa en tu casilla o una adyacente. El primer enemigo que la pise queda **Inmovilizado** y pierde su Defensa hasta su próximo turno.
  - Descripción: Imbuyes el suelo con energía telúrica latente que se activa al contacto, atrapando al enemigo en un cepo de roca viva.
  - Flavor text: _"El suelo que pisas es tu tumba."_

- **Esquiva del Fugitivo**
  - Coste Maná: 2
  - Atributo: Aire
  - Icono: blink
  - Mecánica: Desplázate hasta 2 casillas ignorando ataques de oportunidad.
  - Descripción: Un impulso de viento te propulsa fuera del alcance enemigo antes de que puedan reaccionar.
  - Flavor text: _"Si no me alcanzas, no me matas."_

- **Honda Pétrea**
  - Coste Maná: 3
  - Atributo: Tierra
  - Icono: precise_strike
  - Mecánica: Ataque que inflige poco daño pero aplica un penalizador de -2 dados al siguiente ataque del objetivo.
  - Descripción: Lanzas un proyectil de roca condensada con precisión quirúrgica que atonta y desorienta al enemigo.
  - Flavor text: _"No necesito fuerza cuando tengo puntería."_

**Vacío (Ejecución y Agresión)**

- **Disparo de Plata**
  - Coste Maná: 2
  - Atributo: Metal
  - Icono: unerring_dart
  - Mecánica: Si el objetivo es un Demonio, el primer dado de ataque es un 6 automático (**Crítico**).
  - Descripción: Cargas tu arma con munición de plata encantada que brilla al impactar contra esencias demoníacas.
  - Flavor text: _"Una bala para cada abominación."_

- **Cuchillos Gemelos**
  - Coste Maná: 3
  - Atributo: Metal
  - Icono: fan_cut
  - Mecánica: Realizas un ataque con +1 dado de **Potencia** que puede golpear a dos enemigos diferentes si están adyacentes entre sí.
  - Descripción: Desenvainás dos hojas de metal encantado y las lanzas en arcos gemelos, cortando a dos enemigos con un solo movimiento.
  - Flavor text: _"Dos hojas, dos cortes, un solo instante."_

- **Ponzoña de la Serpiente**
  - Coste Maná: 3
  - Atributo: Oscuridad
  - Icono: fragility_curse
  - Mecánica: Si impactas, el enemigo sufre **Veneno**.
  - Descripción: Tu arma destila un veneno oscuro y corrosivo que se infiltra en la sangre del enemigo, pudriéndolo desde dentro.
  - Flavor text: _"El veneno no tiene prisa. Tu muerte, sí."_

- **Embate de Acero**
  - Coste Maná: 3
  - Atributo: Metal
  - Icono: shield_bash
  - Mecánica: Un ataque físico que empuja al enemigo 1 casilla y le inflige -1 dado de Defensa hasta su próximo turno.
  - Descripción: Cargas con el escudo por delante, canalizando la resonancia metálica para convertir tu defensa en un arma contundente.
  - Flavor text: _"Mi escudo golpea más fuerte que tu espada."_

#### Tier 2

**Forma (Táctica y Supervivencia)**

- **Rastreador del Abismo**
  - Coste Maná: 4
  - Atributo: Oscuridad
  - Icono: oracle_eye
  - Mecánica: Ignoras penalizadores por cobertura o invisibilidad durante 2 turnos.
  - Descripción: Tus ojos se adaptan a las frecuencias del abismo, detectando el latido oscuro de todo ser demoníaco oculto.
  - Flavor text: _"No hay lugar donde ocultar vuestra esencia."_

- **Exorcismo Quirúrgico**
  - Coste Maná: 5
  - Atributo: Metal
  - Icono: precise_strike
  - Mecánica: Si el ataque impacta, eliminas todos los estados beneficiosos del enemigo.
  - Descripción: Clavas una aguja de plata en el flujo de maná del rival, colapsando sus defensas mágicas con precisión de cirujano.
  - Flavor text: _"Vuestros trucos no funcionan aquí."_

- **Emboscada Calculada**
  - Coste Maná: 3
  - Atributo: Mente
  - Icono: shadow_step
  - Mecánica: Si no atacas en este turno, tu siguiente ataque tiene +3 dados de **Potencia** y asegura crítico con 5+.
  - Descripción: Te fundes con el entorno y calculas el momento perfecto para un golpe devastador que el enemigo no verá venir.
  - Flavor text: _"La paciencia es el arma más letal del cazador."_

- **Red de Acero**
  - Coste Maná: 4
  - Atributo: Metal
  - Icono: temporal_prison
  - Mecánica: El objetivo queda **Inmovilizado** y no puede Esquivar.
  - Descripción: Arrojas una red tejida con filamentos de acero encantado que se cierra alrededor del enemigo, inmovilizándolo por completo.
  - Flavor text: _"Nadie escapa de mis redes."_

**Vacío (Ejecución y Agresión)**

- **Paso de Sombras**
  - Coste Maná: 3
  - Atributo: Oscuridad
  - Icono: shadow_step
  - Mecánica: Te teletransportas hasta 2 casillas en cualquier dirección. Tu próximo ataque ignora la Defensa del enemigo.
  - Descripción: Te disuelves en las sombras y reapareces en otro punto del campo de batalla, envuelto en oscuridad residual que ciega al enemigo.
  - Flavor text: _"Las sombras no son ausencia de luz, son puertas."_

- **Veneno de Acónito**
  - Coste Maná: 4
  - Atributo: Oscuridad
  - Icono: fragility_curse
  - Mecánica: El ataque aplica **Veneno** (2 Heridas al inicio de sus siguientes 2 turnos).
  - Descripción: Imbuyes tus proyectiles con extractos botánicos letales diseñados para corromper la sangre demoníaca.
  - Flavor text: _"Lenta, dolorosa y justa..."_

- **Aceite Inflamado**
  - Coste Maná: 5
  - Atributo: Fuego
  - Icono: combustion
  - Mecánica: Colocas una carga de aceite en una casilla o enemigo. Detona al inicio de tu siguiente turno, causando 3 Heridas en área 3x3 y aplicando **Quemadura** a los impactados.
  - Descripción: Preparas una trampa incendiaria con aceite alquímico que estalla en llamas al activarse, abrasando todo en la zona.
  - Flavor text: _"El fuego no distingue entre presa y cazador. Yo sí."_

- **Hambre del Depredador**
  - Coste Maná: 4
  - Atributo: Oscuridad
  - Icono: bite
  - Mecánica: Si matas a un enemigo este turno, recuperas 1 acción de movimiento y 2 puntos de Maná.
  - Descripción: La voracidad del depredador te impulsa hacia la próxima presa, alimentando tu energía oscura con cada muerte.
  - Flavor text: _"Cada muerte me da hambre de la siguiente."_

#### Tier 3

**Forma (Táctica y Supervivencia)**

- **Santuario del Cazador (Ultimate)**
  - Coste Maná: 8
  - Atributo: Luz
  - Icono: light_shield
  - Sacrificio: No puedes usar ataques físicos el siguiente turno.
  - Mecánica: Te vuelves inmune a todo daño y efectos de estado durante este turno.
  - Descripción: Proyectas una zona de realidad pura que anula cualquier influencia externa, creando un santuario inviolable.
  - Flavor text: _"Este espacio me pertenece."_

- **Arco Perforador**
  - Coste Maná: 6
  - Atributo: Metal
  - Icono: unerring_dart
  - Mecánica: Tu alcance se vuelve infinito y tu ataque ignora cobertura y defensa.
  - Descripción: Tensar tu arco canaliza la esencia del metal a través del proyectil, que perfora todo obstáculo hasta alcanzar su objetivo.
  - Flavor text: _"Mi flecha no conoce la distancia ni la derrota."_

- **Voluntad Inquebrantable**
  - Coste Maná: 6
  - Atributo: Tierra
  - Icono: unbreakable_formation
  - Mecánica: Te vuelves inmune a **Aturdido** e **Inmovilizado** durante 2 turnos.
  - Descripción: Enraízas tu voluntad en la roca viva del mundo, volviéndote tan inamovible como una montaña.
  - Flavor text: _"Ni el viento ni el trueno me harán retroceder."_

- **Espinas de la Maldición**
  - Coste Maná: 7
  - Atributo: Tierra
  - Icono: nullify
  - Mecánica: Colocas 3 minas invisibles en casillas adyacentes. El primer enemigo que pise cada una sufre 4 Heridas.
  - Descripción: Siembras el terreno con espinas telúricas invisibles que brotan como púas de roca al contacto con el enemigo.
  - Flavor text: _"La tierra devuelve lo que plantaste: dolor."_

**Vacío (Ejecución y Agresión)**

- **Masacre Bendecida (Ultimate)**
  - Coste Maná: 10
  - Atributo: Metal
  - Icono: wrath_avatar
  - Sacrificio: Tus Heridas actuales se reducen a 1.
  - Mecánica: Realizas un ataque contra cada enemigo visible en escena. Cada impacto exitoso se considera **Crítico**.
  - Descripción: Entras en un trance de muerte donde cada movimiento es una sentencia definitiva, segando vidas sin detenerte.
  - Flavor text: _"Que el infierno se llene con vuestros gritos."_

- **Despertar Demoníaco**
  - Coste Maná: 8
  - Atributo: Oscuridad
  - Icono: battle_fervor
  - Sacrificio: Sufres 1 Herida al final de cada turno.
  - Mecánica: Reduce el **Umbral de Fuerza (Ataque)** en 1 durante 2 turnos.
  - Descripción: Te transformas parcialmente en aquello que cazas, canalizando la energía oscura del abismo a través de tu cuerpo.
  - Flavor text: _"Para cazar monstruos, debes ser uno."_

- **Ventisca Helada**
  - Coste Maná: 7
  - Atributo: Hielo
  - Icono: ice_lance
  - Mecánica: Disparas a todos los enemigos en un cono frente a ti con +2 dados de Potencia.
  - Descripción: Desatas una ráfaga de cristales de hielo afilados que barren el campo de batalla en un cono devastador.
  - Flavor text: _"El frío no perdona. Yo tampoco."_

- **Juramento de Sangre**
  - Coste Maná: 10
  - Atributo: Oscuridad
  - Icono: audacity
  - Mecánica: Realizas un ataque desesperado, sellado con un voto irrevocable. Si tu vida es inferior a 4 Heridas, el ataque hace daño doble.
  - Descripción: Sellas un pacto con tu propia sangre: cuanto más cerca estés de la muerte, más devastador será tu golpe final.
  - Flavor text: _"Juré acabar con todos ellos. Y cumpliré mi juramento."_

## ❗ Regla de Oro: La Muerte

El regreso de la muerte siempre tiene un precio.

- **Forma:** Pérdida de atributos temporales y deuda de oro/servicio.
- **Vacío:** Corrupción física (cicatrices, mutaciones) y riesgo de locura.

## Archivo de Habilidades

Estas habilidades rompen las reglas convencionales del combate y solo deben otorgarse en circunstancias excepcionales o niveles más allá del Tier 10.

- **Sobretensión**
  - Coste Maná: 10
  - Atributo: Rayo
  - Icono: lightning_burst
  - Mecánica: Todos los atributos fundamentales (Fuerza y Magia) aumentan en +2 durante 2 turnos. Al finalizar el efecto, el usuario queda **Aturdido** 1 turno por el agotamiento.
  - Flavor text: _"El brillo que quema el doble, dura la mitad."_

- **Desolación**
  - Coste Maná: 12
  - Atributo: Oscuridad
  - Icono: stellar_collapse
  - Mecánica: Expandes un área de entropía pura. Ataca a todos los enemigos presentes en el combate con 6 dados de **Potencia**. Los supervivientes reciben **Veneno** permanente.
  - Flavor text: _"Donde yo camino, solo queda el silencio."_

- **Dividir entre Cero**
  - Coste Maná: 15
  - Atributo: Oscuridad
  - Icono: black_hole
  - Sacrificio: Sufres 2 Heridas imparables.
  - Mecánica: Destruye a un enemigo de forma instantánea, borrándolo de la línea temporal. No deja restos ni posibilidad de resurrección.
  - Flavor text: _"No es una muerte, es una cancelación de tu existencia."_

- **Vencer a la muerte**
  - Coste Maná: 12
  - Atributo: Luz
  - Icono: miraculous_protection
  - Sacrificio: El usuario reduce sus Heridas actuales a 1.
  - Mecánica: Revive a un compañero caído, restaurando el 50% de su vida máxima.
  - Flavor text: _"Hoy no es el día en que tu leyenda termina."_

- **Convertir en Tarta**
  - Coste Maná: 8
  - Atributo: Agua
  - Icono: transfusion
  - Mecánica: Conviertes al enemigo en un consumible de repostería. Si un aliado lo consume, recupera 1 Herida de forma permanente.
  - Flavor text: _"Dulce victoria, literalmente."_

### Legados

Estos rasgos y habilidades ancestrales se desbloquearán en fases avanzadas del proyecto. Se conservan aquí por su relevancia narrativa.

#### Templario

- **Guardia del Sol**
  - Tipo: Pasiva
  - Atributo: Luz
  - Icono: light_shield
  - Mecánica: En combate cuerpo a cuerpo, cada **Bloqueo** exitoso devuelve 1 **Impacto** de daño radiante al atacante.

- **Carga Relámpago**
  - Coste Maná: 5
  - Atributo: Rayo
  - Icono: righteous_charge
  - Riesgo: Si no elimina al objetivo, el Templario queda **Expuesto** sin dados de defensa.
  - Mecánica: El Templario atraviesa una línea de enemigos. El primer dado de ataque contra cada objetivo se considera un 6 automático (**Crítico asegurado**).

#### Heraldo

- **Omnisciencia**
  - Coste Maná: 5
  - Atributo: Luz
  - Icono: oracle_eye
  - Mecánica: El Heraldo y sus aliados cercanos pueden repetir (**Re-roll**) sus dados de **Bloqueo** fallidos hasta el inicio del siguiente turno.

- **Danza de la Luna Negra**
  - Coste Maná: 6
  - Atributo: Oscuridad
  - Icono: stellar_collapse
  - Mecánica: Lanza 1 dado de **Potencia** por cada enemigo presente en el combate (mínimo 3 dados).

- **Condenación**
  - Coste Maná: 7
  - Atributo: Oscuridad
  - Icono: summary_execution
  - Mecánica: Ejecuta instantáneamente a un enemigo si le quedan 2 Heridas o menos. Si el enemigo sobrevive o no cumple la condición, el Heraldo recibe 3 **Impactos** directos.

#### Inquisidor

- **Luz Eterna**
  - Tipo: Pasiva
  - Atributo: Luz
  - Icono: blinding_faith
  - Mecánica: Todas las habilidades que apliquen **Purificado** duran un turno adicional y causan +1 Impacto contra demonios.

- **Mártir de la Luz**
  - Tipo: Reacción
  - Atributo: Luz
  - Icono: flaming_apotheosis
  - Mecánica: Al caer a 0 Heridas, el Inquisidor puede realizar un último ataque de área de Luz Sagrada antes de quedar fuera de combate.

#### Cazademonios

- **Sangre Fría**
  - Tipo: Pasiva
  - Atributo: Mente
  - Icono: iron_bastion
  - Mecánica: El Cazademonios es inmune a los efectos de "Miedo" y obtiene +1 dado de defensa contra cualquier ataque de tipo Demoníaco.

- **Marca del Verdugo**
  - Coste Maná: 4
  - Atributo: Oscuridad
  - Icono: fragility_curse
  - Mecánica: Marca a un enemigo. Todos los ataques exitosos contra ese objetivo se consideran **Críticos** hasta que muera o el Cazademonios elija otro objetivo.
