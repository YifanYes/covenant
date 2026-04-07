# Sistema de Inversiones

Las inversiones son proyectos colectivos donde los jugadores pueden contribuir oro para influir directamente en el estado del mundo. Cada inversión tiene un objetivo de oro y una fecha límite. El resultado altera el mapa y las condiciones del juego.

---

## Mecánica de Inversiones

### Reglas Básicas

1. **Contribución libre**: Los jugadores pueden invertir cualquier cantidad de oro en cualquier inversión activa
2. **Sin devoluciones**: El oro invertido no se devuelve, independientemente del resultado
3. **Progreso visible**: Los jugadores pueden ver el progreso actual de cada inversión
4. **Fecha límite estricta**: Al llegar la fecha, se evalúa el resultado inmediatamente

### Escalado Dinámico de Objetivos

Los objetivos de cada inversión se calculan dinámicamente según la base de jugadores:

**Fórmula**: `Objetivo = Base + (Jugadores_Activos × Factor_Inversión)`

| Inversión | Base | Factor | Objetivo (10 jugadores) | Objetivo (60 jugadores) |
|-----------|------|--------|-------------------------|-------------------------|
| Barrera Anti-Demonios | 1,000 | ×80 | 1,800 oro | 5,800 oro |
| Ritual de Purificación | 2,000 | ×100 | 3,000 oro | 8,000 oro |
| Operación Corazón Oscuro | 2,500 | ×125 | 3,750 oro | 10,000 oro |
| Programa de Armamento | 1,500 | ×90 | 2,400 oro | 6,900 oro |

> **Nota**: Los objetivos mostrados en las inversiones son ejemplos para ~60 jugadores activos.

### Escalas de Éxito

| Porcentaje alcanzado | Resultado |
|---------------------|-----------|
| 0-25% | Fracaso catastrófico (peores consecuencias) |
| 26-50% | Fracaso parcial (consecuencias negativas moderadas) |
| 51-75% | Éxito parcial (beneficios limitados, sin consecuencias negativas) |
| 76-100% | Éxito total (todos los beneficios) |
| >100% | Éxito excepcional (beneficios adicionales secretos) |

### Interacción con el Mapa

Cada inversión completada o fallida modifica:
- El estado de las ciudades en `Mapa.md`
- Las facciones disponibles y su disposición
- Los enemigos que aparecen en ciertas zonas
- Las misiones y actividades disponibles

---

## Inversiones Activas - Arco: Defensa de Santa Cruz

### 🛡️ Inversión 1: Barrera Anti-Demonios

> *Los alquimistas de Asunción han desarrollado un prototipo de barrera sagrada capaz de purificar demonios menores. Solo necesitan fondos para los materiales... y quizás un seguro de vida.*

| Detalle | Valor |
|---------|-------|
| **Objetivo** | ~5,800 oro |
| **Fecha límite** | 1 mes |
| **Ubicación** | Santa Cruz (Sede Plateada) |

**Texto de éxito:** ¡La barrera se alza! Los demonios menores se desintegran al tocarla. Los alquimistas están tan sorprendidos como nosotros de que funcionara (・∀・) 

**Si se completa:**
- Se establece la barrera alrededor de la Sede Plateada
- Los demonios menores que crucen la barrera son purificados instantáneamente
- Los Seis Poderes Infernales deben atacar directamente en lugar de usar hordas
- Bonus de 200 oro a todos los contribuidores

**Texto de fracaso:** Los alquimistas se quedaron sin fondos a mitad del ritual. La "barrera" resultó ser una cortina con purpurina. Los demonios están riéndose. Literalmente. Se escucha desde aquí (╥﹏╥)

**Si falla:**
- Los alquimistas abandonan el proyecto por falta de recursos
- Las hordas demoníacas pueden entrar sin resistencia mágica
- Si además cae la muralla norte o sur, los demonios entran y masacran ciudadanos

---

### 📜 Inversión 2: Ritual de Purificación de Providencia

> *Los monjes de Asunción creen que pueden purificar las ruinas de Providencia y crear un frente secundario. "Creemos" es la palabra clave aquí.*

| Detalle | Valor |
|---------|-------|
| **Objetivo** | ~8,000 oro |
| **Fecha límite** | 1 mes |
| **Ubicación** | Ruinas de Providencia |

**Texto de éxito:** ¡Providencia renace de las cenizas! Los monjes cantan victoria... bueno, cantan himnos, pero con mucha emoción ♪(´ε` )

**Si se completa:**
- Providencia es purificada y reclamada como punto estratégico
- Se crea un frente secundario que divide las fuerzas demoníacas
- Los demonios deben elegir entre mantener el asedio o defender su retaguardia
- Bonus de 300 oro a todos los contribuidores
- Nueva actividad desbloqueada: "Reconstruir Providencia"

**Texto de fracaso:** Los monjes llegaron a las ruinas llenos de fe. Volvieron... bueno, no volvieron. Las ruinas ahora brillan con un rojo muy poco sagrado (；一_一)

**Si falla:**
- Los monjes que intentan el ritual son masacrados
- Las ruinas de Providencia se transforman en una fortaleza demoníaca permanente
- Los demonios ganan un punto de teletransportación cerca de Santa Cruz
- Nueva actividad de emergencia: "Destruir el Portal de Providencia"

---

### 🗡️ Inversión 3: Operación Corazón Oscuro

> *Mientras los Seis Poderes atacan Santa Cruz, Sodoma y Gomorra están desprotegidas. Un golpe quirúrgico podría destruir sus fundiciones y desbaratar sus líneas de suministro. ¿Suicida? Quizás. ¿Épico? Definitivamente.*

| Detalle | Valor |
|---------|-------|
| **Objetivo** | ~10,000 oro |
| **Fecha límite** | 1 mes |
| **Ubicación** | Sodoma / Gomorra |

**Texto de éxito:** ¡BOOM! La Forja Infernal arde... con su propio fuego. Irónico, ¿no? El Anticristo está que echa humo. Más humo del habitual ᕦ(ò_óˇ)ᕤ

**Si se completa:**
- Un escuadrón de élite infiltra y destruye la Forja Infernal de Gomorra
- Los demonios pierden la capacidad de crear armas malditas
- El Anticristo debe retirar uno de los Seis Poderes para proteger su territorio
- Bonus de 500 oro a todos los contribuidores
- Los enemigos demoníacos tienen -1 dado de Potencia permanentemente

**Texto de fracaso:** El escuadrón fue capturado. Las últimas transmisiones hablaban de "hospitalidad demoníaca". No queremos saber los detalles (゜-゜)

**Si falla:**
- El escuadrón es capturado y corrompido
- Gomorra duplica su producción de armas como represalia
- Los demonios ganan equipo mejor que los defensores
- Nuevos enemigos: "Caballeros Corrompidos" (antiguos miembros del escuadrón)

---

### 🔫 Inversión 4: Programa de Armamento de Segunda Generación

> *La Liga de los Alquimistas ofrece compartir sus secretos de percusión mágica y cartuchos sellados... por un precio. El capitalismo sobrevive incluso al apocalipsis.*

| Detalle | Valor |
|---------|-------|
| **Objetivo** | ~6,900 oro |
| **Fecha límite** | 3 semanas |
| **Ubicación** | Talleres de Trinidad / Santa Cruz |

#### Contexto Tecnológico

Actualmente, las fuerzas de Santa Cruz usan armas de **Generación 1** (chispa, acero funcional). La Segunda Generación introduce:
- **Cartucho unificado**: Pólvora + proyectil + fulminante sellados
- **Percusión mágica**: Ignición instantánea y consistente
- **Materiales superiores**: Acero Sagrado, conductores de Plata/Iridio
- **Cargadores básicos**: 3 proyectiles por carga

**Texto de éxito:** ¡La Liga cumple su palabra! Las nuevas armas disparan sin fallar. Los demonios descubren que "a prueba de magia" no significa "a prueba de balas" (☞゚ヮ゚)☞

**Si se completa:**
- La Liga de los Alquimistas establece talleres en Santa Cruz
- Los defensores reciben **Rifles de Percusión** (Tier 3) y **Pistolas Compactas** (Tier 4)
- +1 dado de Potencia para todas las armas de fuego de los jugadores durante el asedio
- Se desbloquean nuevos ítems en la tienda: armas de Gen 2
- La Liga de los Alquimistas cambia de "Neutral" a "Aliada temporal"
- Bonus de 250 oro a todos los contribuidores

**Texto de fracaso:** La Liga se quedó con el dinero y desapareció. Quién lo hubiera imaginado. Los contratos ahora incluyen "sin demonios" como excusa válida de impago ┐(´д`)┌

**Si falla:**
- La Liga de los Alquimistas mantiene sus secretos
- Los demonios continúan teniendo superioridad armamentística (armas de Gomorra)
- La Liga considera aliarse con el bando ganador... incluyendo a los demonios
- No se desbloquean nuevas armas

---

## Historial de Inversiones

*Aquí se registrarán las inversiones completadas y sus resultados.*

| Inversión | Resultado | Fecha | Oro recaudado | % Objetivo |
|-----------|-----------|-------|---------------|------------|
| - | - | - | - | - |
