# Notas de Diseño

Este documento recopila la investigación y propuestas de diseño solicitadas.

- Lo que desean los jugadores son recompensas significativas por su tiempo, no solo “números que suben".

## Análisis de Referencia: Helldivers 2 y la Narrativa Emergente

Helldivers 2 es el estándar de oro actual para la narrativa comunitaria ("Galactic War").
**¿Cómo funciona?**
*   **Game Master Humano ("Joel"):** No es una IA. Hay una persona/equipo ajustando la dificultad y los eventos en tiempo real. Si la comunidad va ganando muy rápido, envían una flota invasora inesperada.
*   **Órdenes Mayores (Major Orders):** Objetivos temporales claros para toda la comunidad. Ej: "Liberar el planeta X en 3 días".
    *   **Éxito:** Desbloquea nueva tecnología (mechs, armas) o avanza la historia positivamente.
    *   **Fracaso:** Se pierde territorio, los enemigos ganan bonos, o se destruyen instalaciones.
*   **Consecuencias Tangibles:** En una ocasión, se pidió elegir entre "Salvar a unos niños de un hospital" o "Salvar una fábrica de minas antitanque". La comunidad eligió a los niños. Recompensa: Los niños donaron sus dibujos a la causa (lore) vs haber conseguido las minas (gameplay). Esto generó una conversación masiva.

**Aplicación en ARQ:**
*   Las **"Misiones de Temporada"** en la App deben ser Órdenes Mayores.
*   Ejemplo: *Temporada 1: El Asedio de Santa Cruz.* Si la comunidad completa 10.000 hábitos de "Lectura", se descifra un tomo antiguo y ganan una doctrina de Luz global. Si fallan, el enemigo gana resistencia a la Luz en la siguiente temporada.

## Clichés de Fantasía Medieval (A Evitar o Invertir)

Para que ARQ se sienta único y bíblico/apocalíptico, evita estos tropos:

1.  **La Taberna:** "Os encontráis en una taberna buscando trabajo..."
    *   *Inversión ARQ:* Empezáis en una trinchera bajo lluvia de ceniza, o resucitando en un altar tras haber muerto en la última batalla.
2.  **Razas Estándar:** Elfos arrogantes, Enanos mineros, Orcos tontos.
    *   *Sustitución ARQ:* Humanos Fieles, Humanos Herejes, Demonios, Ángeles, Nefilim (Híbridos). No hay razas "no humanas" amistosas, solo humanidad y divinidad/maldad. Incluso ángeles malvados y demonios benévolos.
3.  **El Gremio de Aventureros:** Una organización burocrática que da misiones.
    *   *Sustitución ARQ:* Órdenes Sagradas Militares. No es un trabajo, es un deber sagrado. Obediencia ciega vs Fanatismo.
4.  **El Nigromante Incomprendido:** Magia oscura usada para el bien.
    *   *Postura ARQ:* El Vacío corrompe siempre. Puedes usarlo, pero te pasará factura física y mental. No es gratis.
5.  **Politeísmo Genérico:** "Dios de la Guerra", "Diosa de la Cosecha".
    *   *Postura ARQ:* Monoteísmo estricto (El Creador) vs La Rebelión (Lucifer). Da un peso moral mucho mayor.
6.  **Tecnología Estancada:** El mundo lleva 3000 años igual.
    *   *Inversión ARQ:* Hay evolución. Mosquetes, trincheras, tecnología alquímica. Es un "Napoleonic/WW1 Fantasy".

## Sensibilidad Religiosa y Legal

*   **Legal:** No hay copyright sobre la Biblia. Puedes usar nombres (Miguel, Gabriel, Lucifer) y citas libremente. Es Dominio Público.
*   **Sensibilidad:**
    *   *Riesgo:* Trivializar lo sagrado. Convertir a Jesús en un "NPC que te da quest" es irrespetuoso.
    *   *Solución:* Mantener la divinidad como algo inalcanzable y misterioso. Los ángeles rara vez hablan, son fuerzas de la naturaleza. Usar el respeto y el temor de Dios (*Timor Dei*) como tono narrativo.
    *   **Aviso:** Incluir un *disclaimer* claro: "Obra de ficción inspirada en temas bíblicos. No representa teología oficial."

## Propuestas Mecánicas

### Simplificación del "Mana Burn" (Sobrecarga)

**Problema:** Contar doctrinas por turno es tedioso en mesa.
**Solución: El Dado de Desgaste (Usage Die).**
*   Esta mecánica es popular en *The Black Hack*.
*   **En Mesa:** Tienes un dado de "Reserva" (ej. D6).
*   Cada vez que lanzas una doctrina potente, tiras el dado de Reserva.
    *   Si sale 1-2: El dado "baja de tamaño" (D6 -> D4 -> Agotado/Sobrecarga).
*   **En App:** Se calcula automáticamente con contadores precisos.

**Alternativa Visual (Propuesta elegida): Contadores de Calor.**
*   Lanzar doctrina básica: +0 Calor.
*   Lanzar doctrina fuerte: +1 Calor.
*   Si Calor > Tier del personaje: **Quemadura** (1 daño por cada punto extra).
*   Se limpia al final del turno.
*   *En mesa:* Simplemente pones un token rojo cada vez que usas una skill fuerte. Si tienes más tokens que tu Tier, te haces daño. Súper visual y simple.


## Análisis de Referencia: Warhammer, juegos, IP y análisis estratégico

Warhammer es la franquicia principal de Games Workshop (GW), una empresa británica que diseña, fabrica y distribuye miniaturas, escenarios, libros y otros productos para juegos ambientados en universos de fantasía y ciencia-ficción. Sus líneas principales son **Warhammer 40,000** y **Warhammer Age of Sigmar**, acompañadas por una amplia constelación de juegos menores, derivados y productos multimedia. GW opera con un modelo **verticalmente integrado**, controlando diseño, producción, distribución y venta directa, lo que le permite altos márgenes y fuerte control de marca.

### Juegos de Warhammer

#### Juegos principales
- **Warhammer 40,000 (40K)**: Ciencia-ficción grimdark. Principal motor comercial de la empresa.
- **Warhammer Age of Sigmar (AoS)**: Fantasía épica. Sustituyó a Warhammer Fantasy Battles.

#### Juegos secundarios / especialistas
- **Kill Team** (40K, escaramuzas)
- **Warcry** (AoS, escaramuzas)
- **Necromunda** (guerras de bandas en colmenas)
- **The Horus Heresy** (miniaturas a gran escala, público veterano)
- **Blood Bowl** (deporte fantástico)
- **Warhammer Underworlds**
- **Warhammer Quest**
- **Space Hulk**
- **Middle-earth Strategy Battle Game** (licencia externa)

#### Videojuegos
- *Dawn of War*
- *Total War: Warhammer*
- *Vermintide*
- *Space Marine*
- *Necromunda: Underhive Wars*
- Otros títulos de calidad muy desigual (licencias amplias, control variable)

### Propiedad Intelectual (IP)

Warhammer es una IP **cerrada y altamente protegida**. GW ejerce un control legal agresivo sobre:
- Miniaturas y diseños
- Terminología (intentos de registrar términos genéricos como “Space Marines”)
- Contenido audiovisual derivado

#### Black Library
- Editorial interna de novelas, relatos y audiolibros.
- Gran peso en el *lore*, pero calidad irregular.
- Canon muy flexible → contradicciones frecuentes.

#### Warhammer+
- Servicio propio de streaming.
- Muy criticado por:
  - Contenido limitado
  - Uso de talento fan previamente reprimido
  - Bajo valor percibido frente al precio

### Política corporativa y relación con la comunidad

#### Principales quejas de la comunidad
- **Precios extremadamente altos** (ejércitos completos = cientos o miles de euros).
- **Cambios constantes de reglas** que invalidan compras recientes.
- **Política anti-fan**:
  - Prohibición explícita de animaciones fan.
  - Cierre o presión legal sobre proyectos comunitarios.
- **Contradicción central**:
  - “El hobby es creativo” vs “no crees nada sin licencia”.

#### Cultura corporativa percibida
- Paternalista y cerrada.
- Comunicación unilateral.
- Poca transparencia en decisiones impopulares.

### Estrategia empresarial

#### Modelo de negocio
- Integración vertical total.
- Venta directa (tiendas propias + web).
- Licencias selectivas (videojuegos, TV, merchandising).
- Comunidad como canal de marketing gratuito, pero no como actor con poder.

#### Resultados financieros (2024/25)
- Ingresos: **£617,5 millones**
- Beneficio antes de impuestos: **£262,8 millones**
- Márgenes excepcionalmente altos.
- Dividendo muy elevado → prioridad al accionista.

#### Fortalezas
- IP extremadamente fuerte.
- Fidelidad de marca.
- Control total del ecosistema.
- Flujo de caja muy sólido.

#### Debilidades
- Dependencia casi total de Warhammer 40K y AoS.
- Precios como barrera de entrada.
- Tensiones constantes con la base creativa.
- Escasa innovación estructural en el modelo de juego.

### Vulnerabilidades explotables por competidores

- **Precio**: juegos alternativos más baratos o miniaturas compatibles.
- **Apertura**: reglas open-source o licencias permisivas.
- **Comunidad**: apoyo real a creadores, mods, fan content.
- **Formato**: juegos híbridos (AFK, digital-first, narrativos).
- **Impresión 3D**: amenaza directa al modelo de miniatura propietaria.

Ejemplos de competidores relevantes:
- Mantic Games
- Corvus Belli (Infinity)
- Juegos indie financiados por crowdfunding
- Ecosistemas de impresión 3D + reglas abiertas

### Caso España

- Presencia directa desde los años 90 (ex-Joc Internacional).
- Filiales propias en Barcelona (venta y logística).
- Comunidad activa pero pequeña comparada con UK/EEUU.
- Quejas habituales:
  - Menor localización de contenidos.
  - Pérdida de eventos oficiales.
  - Dependencia total de precios oficiales.

### Conclusión crítica

Games Workshop es una empresa **financieramente brillante pero culturalmente rígida**.
Ha convertido Warhammer en una máquina de rentabilidad, pero a costa de:
- Alienar a parte de su comunidad más creativa.
- Crear un ecosistema cerrado vulnerable a disrupciones externas.

Mientras la IP siga siendo dominante, el modelo funciona.
Pero su mayor riesgo no es financiero, sino **cultural y estructural**:
si aparece un competidor que combine precios razonables, apertura creativa y buen diseño de juego, GW no está bien posicionada para adaptarse rápido.

Warhammer no tiene rival directo hoy.
Pero su forma de operar está diseñada para un mundo donde el fandom no tiene alternativas.

## Análisis Octalysis del Ecosistema ARQ

Este análisis evalúa el equilibrio de motivación en el ecosistema dual de ARQ (App + Juego de Mesa) bajo el marco de Yu-kai Chou.

### Estado Actual

| Core Drive | Aplicación (Productividad) | Juego de Mesa (Rol) |
| :--- | :--- | :--- |
| **1. Significado Épico** | **Débil:** La conexión entre "lavar platos" y "matar demonios" es abstracta. Depende de la imaginación del usuario. | **Muy Fuerte:** Narrativa bíblica, salvación del mundo, lucha contra el mal absoluto. |
| **2. Desarrollo y Logro** | **Fuerte (Lineal):** Listas de tareas, niveles, tiers. Feedback claro de progreso. | **Fuerte:** Superar misiones, subir stats, conseguir loot. |
| **3. Creatividad** | **Débil:** El usuario solo "ejecuta" tareas. Poca estrategia en *cómo* completarlas. | **Media/Alta:** Tácticas de combate, builds de personaje, resolución de problemas. |
| **4. Propiedad** | **Muy Fuerte:** Son *tus* tareas, *tu* vida real, *tu* personaje que mejora. | **Alta:** Equipo personalizado, hoja de personaje. |
| **5. Influencia Social** | **Media:** Misiones comunitarias (propuesta Helldivers). Falta interacción directa diaria. | **Alta:** Juego cooperativo intrínseco. Dependencia del grupo. |
| **6. Escasez** | **Media:** Tiempo real (24h), Cooldowns. | **Alta:** Maná limitado, acciones limitadas, riesgo de muerte permanente. |
| **7. Imprevisibilidad** | **Muy Débil:** 1 Tarea siempre da X oro. Es predecible y puede volverse monótono. | **Alta:** Dados, eventos aleatorios, IA del enemigo. |
| **8. Pérdida y Evitación** | **Fuerte (Black Hat):** Miedo a perder la racha o el personaje. | **Muy Fuerte:** Muerte permanente = perder todo el progreso. |

### Diagnóstico: Lo que hacemos bien vs. mal

#### ✅ Aciertos (Aplicando bien)
1.  **Sinergia de Propiedad (CD4):** Al vincular el personaje a la vida real, el "dolor" de perderlo (CD8) es un motivador masivo para mantener la disciplina.
2.  **Narrativa Elevada (CD1):** Usar el tono bíblico/apocalíptico eleva tareas mundanas. No es "ir al gimnasio", es "entrenar para la Guerra Santa".
3.  **Feedback Visual (CD2):** La conversión de Tarea -> Daño al enemigo es satisfactoria e inmediata.

#### ❌ Errores y Riesgos (Aplicando mal)
1.  **Exceso de "Black Hat" en la App:** El sistema castiga mucho (perder vida por inacción) pero recompensa de forma predecible. Esto genera "burnout". El usuario cumple por miedo, no por diversión.
2.  **Aburrimiento por Predictibilidad (Falta de CD7 en App):** Si completar un hábito siempre da 10 XP, se siente como un trabajo. Falta la emoción del "gacha" o el loot aleatorio en el día a día.
3.  **Desconexión Creativa (Falta de CD3 en App):** La app es una "To-Do List" glorificada con skin de RPG. Falta juego real en la gestión de tareas.

### Propuestas de Mejora (Fixes)

#### Para reducir el Burnout (Más White Hat)
*   **Mecánica de "Gracia Divina" (CD7 + CD2):** Al completar una tarea, hay un % pequeño de obtener una "Bendición" (Buff temporal para la raid del finde o un material ultra-raro). Convertir la rutina en una tragaperras positiva.
*   **Rachas Visuales (CD2):** Visualizar el "Fuego del Espíritu". Si cumples 3 días seguidos, tu personaje brilla en la interfaz. No solo números, sino estética.

#### Para aumentar la Estrategia (Más CD3)
*   **Combos de Tareas:** Permitir al usuario agrupar 3 tareas pequeñas para lanzar un "Ataque Pesado" en la app. Que el orden en que las tacha importe.
    *   *Ejemplo:* "Si hago 'Ejercicio' + 'Meditar' seguidos, activo el bonus 'Mente y Cuerpo' que da doble XP".
*   **Equipamiento con Misiones:** Que las armas requieran tareas específicas para desbloquear su potencial. "Para despertar esta espada, debes completar 5 tareas de 'Estudio'".

#### Para mejorar la Narrativa (Más CD1)

*   **Flavor Text Dinámico:** Cuando completas una tarea, la app no debe decir "Tarea completada", sino "Has purificado una zona de tu mente".

## Tópicos y clichés más comunes en RPGs

### Narrativa
- **Elegido profetizado** destinado a salvar el mundo.
- **Amnesia del protagonista** como excusa de tutorial.
- **Imperio maligno** con estética totalitaria genérica.
- **Villano que “no es realmente malo”**, solo incomprendido.
- **Deidad creadora corrupta** que debe ser derrocada.
- **Mundo al borde del apocalipsis permanente.**
- **Giro tardío:** el mentor es traidor o muere.
- **Artefacto ancestral** con poder ilimitado.

### Personajes
- **Guerrero estoico** sin conflicto interno real.
- **Mago anciano** omnisciente.
- **Pícaro sarcástico** con pasado criminal vago.
- **Princesa/reina competente** solo en cinemáticas.
- **Antihéroe edgy** definido por trauma genérico.
- **Compañero “bestia”** usado como alivio cómico.

### Mundo y facciones
- **Reinos elementales** (fuego, hielo, sombra, luz).
- **Razas monoculturales** y moralmente homogéneas.
- **Elfos longevos arrogantes, enanos rudos mineros.**
- **Orden religiosa corrupta** por defecto.
- **Gremio neutral** que controla todo sin oposición.

### Jugabilidad
- **Ratas/lobos** como primeros enemigos.
- **Misiones de recadero** encubiertas de épica.
- **Escalado de enemigos** incoherente con la narrativa.
- **Sistema de karma binario** bueno/malo.
- **Crafting obligatorio** para progresar.
- **Árboles de habilidades inflados** con mejoras marginales (+5%).
- **Jefes inmunes a estados** por conveniencia.

### Progresión
- **De campesino a semidiós** en horas.
- **Niveles que invalidan equipo previo** abruptamente.
- **Estadísticas opacas** que esconden fórmulas simples.
- **Rarezas de ítems** como sustituto de diseño.

### Temas
- **Forma = tiranía, Vacío = libertad** simplificada.
- **Tecnología siempre corrompe**, naturaleza siempre pura.
- **Guerra como escenario** sin consecuencias civiles reales.
