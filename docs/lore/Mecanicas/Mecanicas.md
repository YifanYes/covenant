# Mecánicas - Juego de Mesa

Este documento define las reglas centrales para el juego de mesa de ARQ. El objetivo es un sistema rápido, letal y fácil de calcular.

## 1. Escala y nivel de abstracción

Al comienzo de la partida, se tira un dado. Quien saque el número mayor empieza los turnos.

Los turnos tienen las siguientes fases:

- **Recuperación:** Los personajes regeneran la cantidad de maná asociada a su clase.
- **Efectos:** Los efectos que tengan los personajes se aplican.
- **Movimiento:** El personaje se mueve las casillas que pueda, según su atributo de velocidad.
- **Combate:** El personaje decide si entrar en combate contra uno o varios enemigos.

## 2. Movimiento, mapa y misiones

El mapa de juego se configura con casillas hexagonales, según se describa en la misión. El mapa puede contener obstáculos, edificios, accidentes geográficos, etc.

- **Línea de Visión (LoS):** Los ataques solo se pueden ejecutar si el enemigo es visible, a no ser que sea un ataque de área.
- **Eventos:** En la misión puede haber eventos aleatorios. Por ejemplo: una misión puede tener un evento de emboscada, en la que aparecen 2 enemigos menores en la retaguardia. Esto ocurre si al principio de un turno se saca un 4.
- **Condiciones de Victoria:** Las misiones tienen condiciones de victoria:
  - Capturar un objetivo.
  - Sabotear un objetivo.
  - Derrotar a un enemigo.
  - Salvar a alguien.
  - Conseguir un material.
  - Sobrevivir un número determinado de turnos.

## 3. Atributos de Combate

Los atributos determinan el poder y la capacidad de reacción del personaje. Cada atributo se divide en dos valores: **Ataque** (capacidad ofensiva) y **Defensa** (capacidad de bloqueo).

- **Velocidad:** Determinada por el **Arma** equipada. Indica el número de casillas que el personaje puede mover. En caso de no portar un arma, la velocidad base es 2.
- **Fuerza:** **Umbral de Éxito** para acciones físicas.
  - **Ataque:** Para impactar con armas físicas (ej. espadas, hachas, pistolas).
  - **Defensa:** Para bloquear impactos físicos.
- **Magia:** **Umbral de Éxito** para acciones mágicas.
  - **Ataque:** Para impactar con doctrinas o armas mágicas (ej. varas, grimorios).
  - **Defensa:** Para bloquear impactos mágicos.

> **Regla de Oro:** Los **Atributos** definen tu **Umbral de Éxito** (Número a superar). El **Equipo y Doctrinas** definen tu **Potencia** (Cantidad de dados). A menor atributo, mayor es tu maestría (necesitas un resultado menor para tener éxito).

## 4. Fórmulas de Vitalidad

- **Vida:** `Base de Clase + (Tier * 2)`. Número de heridas que puede soportar.
  - Ejemplos:
    - Un Templario (Base 8) de Tier 3 tiene `8 + 6 = 14` Heridas.
    - Un Heraldo (Base 5) de Tier 2 tiene `5 + 4 = 9` Heridas.

Con esta fórmula intentamos mantener la letalidad constante: mueres en 3-4 golpes limpios.

- **Maná (Recursos):** Determinado por la clase. Puntos para poder usar doctrinas. Ver [Clases.md](./Clases.md) para detalles específicos de cada clase.

## 5. Sistema de Combate Simétrico

El combate se resuelve comparando **Impactos** (ataque exitoso) contra **Bloqueos** (defensa exitosa). Si sale un 6, se considera un crítico. Solo puede ser defendido por otro 6.

- **Potencia:** puede ser de ataque o defensa. Se refiere al total de dados que se lanzan, después de tener en cuenta los atributos, el equipamiento y las doctrinas.

### Paso 1: Ataque

El atacante lanza una cantidad de dados igual a su **Potencia de Ataque** (Dados del Arma + Dados de Doctrina).

- **Éxito:** Cada dado que sea **igual o mayor** a su **Umbral de Ataque** (Fuerza o Magia) genera **1 Impacto**.

### Paso 2: Defensa

El defensor lanza una cantidad de dados igual a su **Potencia de Defensa** (Dados de Armadura).

- **Bloqueo:** Cada dado que sea **igual o mayor** a su **Umbral de Defensa** (Fuerza o Magia) anula **1 Impacto**.

### Paso 3: Resolución

Cada Impacto no bloqueado resta **1 Herida**. Si las Heridas llegan a 0, el defensor es derrotado.

## 6. El Ciclo del Usuario

El progreso del personaje está ligado directamente a la disciplina en el mundo real.

- **Subida de Tier:** El progreso se basa en misiones completadas. Superar un número determinado de misiones de un tier permite desbloquear el acceso al siguiente escalafón de poder (ver [Clases.md](./Clases.md) para los requisitos específicos de cada tier).
- **Derrota:** Si las Heridas llegan a 0, el personaje es derrotado.
  _ App web: Tarda 24h en recuperarse, a menos que complete tareas o hábitos que aceleren la curación, o que un compañero le reanime.
  _ Juego de mesa: El personaje puede volver a la misión si un compañero lo reanima, o si se usa un cristal de estasis.
