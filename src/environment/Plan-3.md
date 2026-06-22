# PRD Addendum v0.3 — Visual Upgrade, Window Invasion System, Remove Aim Hints

## 1. Resumen

La versión actual funciona, pero las habitaciones se sienten demasiado oscuras y vacías. La siguiente actualización debe mejorar el ambiente visual, aumentar la claridad de iluminación, agregar decoración básica y cambiar el sistema de spawn de zombies para que entren desde afuera a través de ventanas.

También se deben eliminar las ayudas/hints que aparecen cuando el jugador apunta a los zombies. El jugador solo debe ver el label del zombie, por ejemplo `A`, `B`, `C` o `D`. No debe aparecer ningún mensaje que diga si esa opción es correcta o incorrecta.

---

# 2. Objetivos de v0.3

## Objetivos principales

1. Hacer que las habitaciones se vean más claras, decoradas y vivas.
2. Cambiar materiales oscuros por paredes más legibles y visualmente interesantes.
3. Agregar paredes tipo ladrillo, paredes pintadas, posters, carteles, luces y detalles simples.
4. Agregar ventanas por donde los zombies entran desde afuera.
5. Permitir que el jugador mate zombies antes de que entren al edificio.
6. Agregar animación simple de zombies trepando por ventanas.
7. Remover hints semánticas al apuntar a zombies.
8. Mantener visible la pared principal con pregunta y respuestas.
9. Mantener geometría simple basada en boxes y primitives.

---

# 3. Problema actual

## 3.1 Habitaciones oscuras

Las habitaciones se sienten demasiado oscuras. Posibles causas:

* paredes muy oscuras;
* poca luz ambiental;
* falta de luces locales;
* materiales con bajo contraste;
* ausencia de detalles visuales;
* espacios demasiado planos o vacíos.

## 3.2 Zombies aparecen “dentro” del mapa

Actualmente los zombies probablemente aparecen dentro de la habitación o cerca del jugador. Esto funciona técnicamente, pero se siente menos interesante.

Queremos que los zombies parezcan venir de afuera, entrar por ventanas y luego perseguir al jugador.

## 3.3 Hints al apuntar

Actualmente, cuando el jugador apunta a un zombie, aparece un mensaje que indica si la respuesta es correcta o incorrecta.

Eso debe eliminarse.

El juego debe ser justo, pero no debe regalar la respuesta.

---

# 4. Nueva dirección visual

## 4.1 Estilo general

El mapa debe sentirse como una estación/refugio/edificio subterráneo más vivo.

La estética sigue siendo simple, pero con mejor composición:

* paredes más claras;
* ladrillos proceduralmente dibujados;
* zonas pintadas;
* luces visibles;
* carteles;
* posters;
* tuberías;
* paneles eléctricos;
* señales;
* marcas en el piso;
* ventanas con marcos;
* barricadas simples;
* contraste visual entre habitaciones.

## 4.2 No usar assets externos en v0.3

Para mantener el proyecto simple y fácil para agentes:

* no importar modelos 3D externos;
* no depender de texturas externas;
* usar boxes, planes, DynamicTexture, materiales simples y geometría procedural;
* las decoraciones deben crearse con primitives.

---

# 5. Iluminación

## 5.1 Requisitos

El mapa debe ser claramente visible.

La iluminación debe permitir:

* ver zombies a distancia;
* leer la pared de respuestas;
* identificar puertas;
* identificar ventanas;
* ver armas en paredes;
* navegar sin perderse.

## 5.2 Cambios recomendados

Agregar o ajustar:

```ts id="auzskp"
scene.ambientColor = new BABYLON.Color3(0.35, 0.35, 0.38)
```

Agregar luz hemisférica:

```ts id="gw4tnb"
const hemi = new BABYLON.HemisphericLight(
  "mainHemiLight",
  new BABYLON.Vector3(0, 1, 0),
  scene
)

hemi.intensity = 0.55
```

Agregar luces por habitación:

```ts id="ar9fry"
const roomLight = new BABYLON.PointLight(
  "roomLight_main",
  new BABYLON.Vector3(0, 4, 0),
  scene
)

roomLight.intensity = 0.8
roomLight.range = 18
```

Agregar luces sobre paneles educativos:

```ts id="mtlbjw"
const boardLight = new BABYLON.SpotLight(
  "answerBoardSpot",
  boardPosition.add(new BABYLON.Vector3(0, 3, -2)),
  new BABYLON.Vector3(0, -0.5, 1),
  Math.PI / 3,
  2,
  scene
)

boardLight.intensity = 1.2
```

## 5.3 Reglas de iluminación

* La habitación principal debe ser la más clara.
* Las habitaciones laterales pueden ser más tensas, pero no oscuras.
* Ninguna pared importante debe ser completamente negra.
* El Answer Wall debe estar iluminado siempre.
* Las ventanas deben tener luz exterior fría o contrastante para indicar que los zombies vienen desde afuera.

---

# 6. Materiales y decoración

## 6.1 Paredes tipo ladrillo

Crear material procedural de ladrillo usando `DynamicTexture` o canvas.

No usar imagen externa.

Módulo sugerido:

```txt id="xv2kci"
/src/environment/materials/BrickMaterialFactory.ts
```

API propuesta:

```ts id="f1dw05"
function createBrickWallMaterial(
  scene: BABYLON.Scene,
  options?: {
    baseColor?: string
    mortarColor?: string
    brickWidth?: number
    brickHeight?: number
  }
): BABYLON.StandardMaterial
```

## 6.2 Paredes pintadas

Agregar paredes con base clara y franja de color.

Ejemplo visual:

```txt id="tj07dd"
Parte superior: gris claro / beige
Franja media: azul, verde o naranja
Parte inferior: gris más oscuro
```

Esto puede hacerse con:

* tres cajas delgadas superpuestas;
* o una textura procedural;
* o planos decorativos pegados a la pared.

## 6.3 Decoración simple con boxes

Agregar:

* tuberías en techo y paredes;
* lámparas rectangulares;
* paneles eléctricos;
* señales de salida;
* carteles de estación;
* posters educativos;
* bancos simples;
* cajas/crates;
* columnas con franjas;
* marcas en el piso.

## 6.4 Módulo recomendado

Crear:

```txt id="tjdj61"
/src/environment/RoomDecorator.ts
```

Responsabilidades:

* decorar habitación principal;
* decorar habitación lateral izquierda;
* decorar habitación lateral derecha;
* colocar luces;
* colocar posters;
* colocar pipes;
* colocar señales;
* colocar ventanas.

API:

```ts id="ze42vc"
class RoomDecorator {
  constructor(scene: BABYLON.Scene, materials: EnvironmentMaterials)

  decorateMainRoom(room: RoomBounds): void

  decorateLeftRoom(room: RoomBounds): void

  decorateRightRoom(room: RoomBounds): void
}
```

---

# 7. Window Invasion System

## 7.1 Concepto

Al comienzo de cada round, el jugador está dentro del edificio. Los zombies vienen desde afuera. Entran al edificio trepando por ventanas.

El jugador puede:

* ver zombies aproximándose desde afuera;
* dispararles antes de que entren;
* matarlos mientras trepan;
* matarlos después de que entran;
* defender la habitación principal.

## 7.2 Estructura de una ventana

Cada ventana debe tener:

* marco;
* abertura visible;
* zona exterior;
* punto de spawn afuera;
* punto de entrada;
* punto de aterrizaje dentro;
* posible barricada visual.

Representación:

```txt id="h4uraw"
[ Exterior Spawn ] ---> [ Window Approach ] ---> [ Climb Window ] ---> [ Inside Landing ] ---> [ Chase Player ]
```

## 7.3 Implementación con boxes

Para simular una pared con ventana, no usar boolean/cutting complejo.

Construir la pared con piezas:

```txt id="0lbk5l"
┌─────────────────────┐
│      top wall       │
├──────┐       ┌──────┤
│ left │window │right │
│ wall │ hole  │wall  │
├──────┘       └──────┤
│     bottom wall     │
└─────────────────────┘
```

Es decir:

* caja superior;
* caja inferior;
* caja izquierda;
* caja derecha;
* marco de ventana;
* plano transparente o sin vidrio.

## 7.4 Módulos nuevos

Crear:

```txt id="xef420"
/src/environment/WindowBuilder.ts
/src/spawning/WindowSpawnPoint.ts
/src/enemies/ZombieWindowEntryController.ts
```

## 7.5 Tipos

```ts id="wnsfp1"
export interface WindowEntryPoint {
  id: string
  windowPosition: BABYLON.Vector3
  exteriorSpawnPosition: BABYLON.Vector3
  approachPosition: BABYLON.Vector3
  climbStartPosition: BABYLON.Vector3
  climbEndPosition: BABYLON.Vector3
  insideLandingPosition: BABYLON.Vector3
}
```

## 7.6 Estados del zombie

Agregar estado de entrada:

```ts id="5vx027"
type ZombieState =
  | "outside_approaching"
  | "climbing_window"
  | "inside_chasing"
  | "attacking"
  | "dead"
```

## 7.7 Comportamiento

### outside_approaching

El zombie camina desde afuera hacia la ventana.

Puede recibir disparos.

Si muere afuera, nunca entra.

### climbing_window

El zombie ejecuta animación simple de trepar.

Durante esta fase:

* se mueve lentamente sobre el marco;
* su cuerpo rota levemente;
* brazos pueden levantarse;
* velocidad reducida;
* puede recibir disparos.

### inside_chasing

El zombie ya entró al edificio.

Persigue al jugador normalmente.

### attacking

El zombie daña al jugador si está cerca.

### dead

El zombie deja de moverse y deja de atacar.

---

# 8. Animación de trepar ventana

## 8.1 Animación simple

No usar skeletons.

Durante `climbing_window`:

* torso se inclina hacia adelante;
* brazos suben;
* piernas alternan posición;
* root del zombie se mueve desde `climbStartPosition` hasta `climbEndPosition`;
* luego cae o baja hacia `insideLandingPosition`.

Pseudocódigo:

```ts id="mo9sav"
function updateClimbAnimation(zombie: BoxZombie, progress: number) {
  zombie.root.position = BABYLON.Vector3.Lerp(
    zombie.entryPoint.climbStartPosition,
    zombie.entryPoint.climbEndPosition,
    progress
  )

  zombie.torso.rotation.x = -0.35
  zombie.leftArm.rotation.x = -1.2
  zombie.rightArm.rotation.x = -1.0
  zombie.leftLeg.rotation.x = Math.sin(progress * Math.PI * 2) * 0.4
  zombie.rightLeg.rotation.x = -Math.sin(progress * Math.PI * 2) * 0.4
}
```

## 8.2 Criterios de aceptación

* el zombie parece entrar por la ventana;
* el jugador puede dispararle mientras está afuera;
* el jugador puede dispararle mientras trepa;
* al terminar la animación, el zombie persigue al jugador dentro del edificio.

---

# 9. Spawn por ventanas

## 9.1 Regla

Los zombies no deben aparecer mágicamente dentro de la habitación principal.

Para v0.3:

* zombies principales spawnean afuera;
* caminan hacia ventanas;
* entran por ventanas;
* luego persiguen al jugador.

## 9.2 Mínimo requerido

Agregar al menos:

* 2 ventanas en habitación principal;
* 1 ventana en habitación lateral izquierda;
* 1 ventana en habitación lateral derecha.

Total mínimo:

```txt id="v1jg4o"
4 window entry points
```

## 9.3 Distribución sugerida

Habitación principal:

* ventana norte izquierda;
* ventana norte derecha.

Habitación lateral izquierda:

* ventana grande.

Habitación lateral derecha:

* ventana pequeña.

## 9.4 Spawning por round

El RoundManager o SpawnDirector debe elegir ventanas según dificultad.

Crear:

```txt id="eem2sh"
/src/spawning/SpawnDirector.ts
```

Responsabilidades:

* decidir cuántos zombies spawnear;
* asignar zombies a ventanas;
* escalonar tiempos de spawn;
* evitar que todos aparezcan al mismo tiempo.

API:

```ts id="krltul"
class SpawnDirector {
  constructor(entryPoints: WindowEntryPoint[])

  createSpawnPlan(round: number, options: AnswerOption[]): ZombieSpawnPlan[]
}
```

Tipo:

```ts id="kk9pqo"
interface ZombieSpawnPlan {
  optionId: string
  entryPointId: string
  delayMs: number
}
```

## 9.5 Regla educativa

Debe existir al menos un zombie por opción A/B/C/D.

Los zombies extra deben duplicar opciones incorrectas.

Nunca duplicar la opción correcta en v0.3.

---

# 10. Remover hints al apuntar

## 10.1 Requisito

Eliminar cualquier mensaje que indique al jugador si el zombie apuntado es correcto o incorrecto.

Actualmente puede existir algo como:

```txt id="4nz8v9"
Correct answer
Incorrect answer
This is wrong
Protect this one
Shoot this one
```

Todo eso debe ser removido.

## 10.2 Qué sí se mantiene

Se mantiene:

* label flotante del zombie: `A`, `B`, `C`, `D`;
* pared principal con pregunta;
* pared principal con opciones;
* HUD de vida, dinero, round, arma y ammo;
* crosshair;
* feedback final después de ganar/perder.

## 10.3 Qué se elimina

Eliminar:

* tooltip semántico al apuntar;
* texto que diga si es correcto/incorrecto;
* colores que revelen si una opción es correcta;
* highlight de la respuesta correcta cuando se apunta;
* cualquier ícono que marque cuál zombie proteger.

## 10.4 AimTooltip

Si existe `AimTooltip`, cambiarlo a uno de estos enfoques:

### Opción A — eliminar completamente

Remover el componente `AimTooltip`.

### Opción B — dejar tooltip neutral

Solo mostrar:

```txt id="gtkk2o"
Target: B
```

No mostrar:

```txt id="8yr9fz"
B — París
Correct
Incorrect
```

Recomendación para v0.3:

```txt id="c9smom"
Eliminar AimTooltip completamente.
```

El label sobre el zombie ya es suficiente.

## 10.5 Código a revisar

Buscar y remover llamadas similares a:

```ts id="a5xdkb"
aimTooltip.setTargetOption(option)
aimTooltip.showCorrectness(...)
answerBoard.highlightOption(optionId)
hud.showHint(...)
hud.showTargetHint(...)
```

Si `answerBoard.highlightOption(optionId)` se activa al apuntar, desactivarlo también para no facilitar demasiado la asociación durante combate.

## 10.6 Criterio de aceptación

Cuando el jugador apunta a un zombie:

* no aparece texto adicional;
* no se indica si es correcto;
* no se indica si es incorrecto;
* no se resalta la opción correcta;
* solo se ve el label normal del zombie.

---

# 11. Answer Wall

## 11.1 Se mantiene en habitación principal

La pregunta y respuestas siguen visibles en la pared de la habitación principal.

No moverlas a habitaciones laterales por ahora.

## 11.2 Motivo

Esto fuerza al jugador a recordar, mirar la pared principal y navegar el espacio.

## 11.3 Mejora visual

El Answer Wall debe tener mejor iluminación y contraste.

Requisitos:

* panel más claro;
* texto oscuro sobre fondo claro, o texto claro sobre fondo muy oscuro;
* spotlight dedicado;
* borde visible;
* título de round;
* país actual;
* opciones A/B/C/D.

Ejemplo:

```txt id="r2xcl0"
ROUND 7 — GEOGRAFÍA
¿Cuál es la capital de Alemania?

A — Roma
B — Berlín
C — Madrid
D — Viena
```

---

# 12. Decoración por habitación

## 12.1 Habitación principal

Debe sentirse como centro de defensa.

Agregar:

* Answer Wall iluminado;
* dos ventanas de entrada;
* luces de techo;
* weapon wall buys;
* carteles;
* columnas;
* piso con marcas;
* paredes parcialmente pintadas;
* ladrillos en algunas secciones.

## 12.2 Habitación lateral izquierda

Debe sentirse más abierta.

Agregar:

* una ventana grande;
* crates;
* luz fría exterior;
* shotgun o SMG wall buy;
* tuberías;
* poster o señal.

## 12.3 Habitación lateral derecha

Debe sentirse más estrecha y peligrosa.

Agregar:

* una ventana pequeña;
* luz parpadeante opcional;
* machine gun wall buy;
* pasillo angosto;
* panel eléctrico;
* tuberías bajas.

---

# 13. Nueva estructura sugerida

```txt id="l9npv8"
/src/environment
  SubwayStationBuilder.ts
  RoomBuilder.ts
  RoomDecorator.ts
  WindowBuilder.ts
  DoorBuilder.ts
  Materials.ts
  BrickMaterialFactory.ts
  LightFactory.ts

/src/spawning
  SpawnDirector.ts
  WindowSpawnPoint.ts
  ZombieSpawnPlan.ts

/src/enemies
  BoxZombie.ts
  ZombieAnimator.ts
  ZombieWindowEntryController.ts
  ZombieState.ts

/src/ui
  Hud.ts
  Crosshair.ts
```

Si existe:

```txt id="9upk5z"
/src/ui3d/AimTooltip.ts
```

Eliminarlo o dejarlo sin uso.

---

# 14. Orden de implementación recomendado

## Fase 1 — Remove Aim Hints

Prioridad máxima porque afecta la dificultad educativa.

Tareas:

1. Buscar componente de tooltip/hint al apuntar.
2. Remover mensajes de correcto/incorrecto.
3. Remover highlight de respuesta correcta al apuntar.
4. Mantener labels A/B/C/D sobre zombies.
5. Verificar que el Answer Wall sigue funcionando.

Definition of Done:

* apuntar a un zombie no muestra ayuda semántica;
* no hay forma de saber si un zombie es correcto salvo leyendo la pared.

---

## Fase 2 — Lighting Pass

Tareas:

1. Aumentar luz ambiental.
2. Agregar hemispheric light.
3. Agregar point lights por habitación.
4. Agregar spotlight para Answer Wall.
5. Agregar luz exterior cerca de ventanas.
6. Revisar materiales oscuros.

Definition of Done:

* el mapa ya no se ve oscuro;
* zombies se ven claramente;
* paredes y puertas son legibles;
* Answer Wall se lee sin esfuerzo.

---

## Fase 3 — Materiales y paredes

Tareas:

1. Crear material de ladrillo procedural.
2. Crear material de pared pintada.
3. Aplicar paredes más claras.
4. Agregar franjas de color.
5. Agregar variación entre habitaciones.

Definition of Done:

* habitaciones no parecen cajas negras vacías;
* cada habitación tiene identidad visual;
* no se usaron assets externos.

---

## Fase 4 — Decoración

Tareas:

1. Crear RoomDecorator.
2. Agregar luces visibles.
3. Agregar pipes.
4. Agregar carteles.
5. Agregar posters.
6. Agregar crates.
7. Agregar paneles eléctricos.
8. Agregar marcas de piso.

Definition of Done:

* cada habitación tiene decoración mínima;
* decoración no bloquea el gameplay;
* decoración no impide ver zombies.

---

## Fase 5 — WindowBuilder

Tareas:

1. Crear paredes con aberturas usando boxes.
2. Crear marcos de ventana.
3. Crear posiciones de entrada.
4. Agregar 4 ventanas mínimas.
5. Agregar luz exterior por ventana.

Definition of Done:

* las habitaciones tienen ventanas visibles;
* las ventanas tienen puntos de entrada definidos;
* el jugador puede ver hacia la zona exterior.

---

## Fase 6 — Window Spawn System

Tareas:

1. Crear WindowEntryPoint.
2. Crear SpawnDirector.
3. Spawnear zombies afuera.
4. Mover zombies hacia la ventana.
5. Permitir disparar antes de que entren.
6. Transicionar a climb.
7. Transicionar a chase.

Definition of Done:

* zombies ya no aparecen mágicamente dentro;
* zombies vienen desde afuera;
* zombies pueden ser matados antes de entrar;
* zombies entran por ventanas.

---

## Fase 7 — Climb Animation

Tareas:

1. Crear estado `climbing_window`.
2. Animar torso, brazos y piernas.
3. Mover root por interpolación.
4. Terminar en inside landing point.
5. Cambiar estado a `inside_chasing`.

Definition of Done:

* zombie parece trepar;
* puede recibir disparos mientras trepa;
* luego persigue al jugador normalmente.

---

# 15. Criterios de aceptación finales v0.3

v0.3 está completa cuando:

* las habitaciones tienen más luz;
* las paredes ya no son demasiado oscuras;
* existen paredes tipo ladrillo o pintadas;
* existen decoraciones simples en cada habitación;
* el Answer Wall sigue visible en la habitación principal;
* los zombies vienen desde afuera;
* los zombies entran por ventanas;
* el jugador puede matar zombies antes de que entren;
* los zombies tienen animación simple de trepar;
* no aparecen hints al apuntar;
* no se revela si un zombie es correcto o incorrecto al apuntar;
* labels A/B/C/D siguen visibles;
* el gameplay sigue funcionando por rounds.

---

# 16. Nota de diseño importante

Remover las hints hace que el juego sea más justo como desafío educativo.

El jugador debe usar este flujo mental:

```txt id="m1n82p"
1. Leo la pregunta.
2. Leo las opciones en la pared.
3. Recuerdo cuál letra corresponde a cada respuesta.
4. Identifico zombies por A/B/C/D.
5. Decido cuáles eliminar.
```

No debe ser:

```txt id="isw4oj"
1. Apunto al zombie.
2. El juego me dice si es correcto o incorrecto.
3. Disparo.
```

La pared de respuestas es la fuente de información. El arma no debe convertirse en un detector de respuestas.
