# Plan v0.3 — Fases de Implementación

> **Objetivo general:** Mejorar el ambiente visual, agregar el sistema de invasión por ventanas y remover las ayudas al apuntar.
>
> **Regla global:** No usar assets externos. Solo boxes, planes, DynamicTexture y geometría procedural.

---

## Resumen de Fases

| Fase | Nombre | Prioridad |
|------|--------|-----------|
| 1 | Remove Aim Hints | 🔴 Máxima |
| 2 | Lighting Pass | 🟠 Alta |
| 3 | Materiales y Paredes | 🟡 Media |
| 4 | Decoración | 🟡 Media |
| 5 | WindowBuilder | 🟢 Normal |
| 6 | Window Spawn System | 🟢 Normal |
| 7 | Climb Animation | 🔵 Final |

---

## Fase 1 — Remove Aim Hints

**Prioridad máxima** — afecta directamente la dificultad educativa del juego.

### Problema actual

Cuando el jugador apunta a un zombie, aparece un mensaje que indica si la respuesta es correcta o incorrecta. Eso regala la respuesta y debe eliminarse.

### Qué se elimina

- Tooltip semántico al apuntar
- Texto que diga si es correcto/incorrecto
- Colores que revelen si una opción es correcta
- Highlight de la respuesta correcta cuando se apunta
- Cualquier ícono que marque cuál zombie proteger

### Qué se mantiene

- Label flotante del zombie: `A`, `B`, `C`, `D`
- Pared principal con pregunta y opciones
- HUD de vida, dinero, round, arma y ammo
- Crosshair
- Feedback final después de ganar/perder

### Código a revisar

Buscar y remover llamadas similares a:

```ts
aimTooltip.setTargetOption(option)
aimTooltip.showCorrectness(...)
answerBoard.highlightOption(optionId)
hud.showHint(...)
hud.showTargetHint(...)
```

Si existe `/src/ui3d/AimTooltip.ts`, eliminarlo o dejarlo sin uso.

Si `answerBoard.highlightOption(optionId)` se activa al apuntar, desactivarlo también para no facilitar la asociación durante combate.

### Tareas

- [x] 1. Buscar componente de tooltip/hint al apuntar
- [x] 2. Remover mensajes de correcto/incorrecto
- [x] 3. Remover highlight de respuesta correcta al apuntar
- [x] 4. Mantener labels A/B/C/D sobre zombies
- [x] 5. Verificar que el Answer Wall sigue funcionando

### Definition of Done

- Apuntar a un zombie **no muestra** ayuda semántica
- No hay forma de saber si un zombie es correcto salvo leyendo la pared

---

## Fase 2 — Lighting Pass

**Objetivo:** Las habitaciones deben verse claramente iluminadas. El jugador debe poder ver zombies a distancia, leer la pared de respuestas, identificar puertas y ventanas, ver armas en paredes y navegar sin perderse.

### Cambios de iluminación

Ajustar luz ambiental:

```ts
scene.ambientColor = new BABYLON.Color3(0.35, 0.35, 0.38)
```

Agregar luz hemisférica:

```ts
const hemi = new BABYLON.HemisphericLight(
  "mainHemiLight",
  new BABYLON.Vector3(0, 1, 0),
  scene
)
hemi.intensity = 0.55
```

Agregar point lights por habitación:

```ts
const roomLight = new BABYLON.PointLight(
  "roomLight_main",
  new BABYLON.Vector3(0, 4, 0),
  scene
)
roomLight.intensity = 0.8
roomLight.range = 18
```

Agregar spotlight para el Answer Wall:

```ts
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

### Reglas de iluminación

- La habitación principal debe ser la más clara
- Las habitaciones laterales pueden ser más tensas, pero **no oscuras**
- Ninguna pared importante debe ser completamente negra
- El Answer Wall debe estar iluminado siempre
- Las ventanas deben tener luz exterior fría o contrastante para indicar que los zombies vienen de afuera

### Tareas

- [ ] 1. Aumentar luz ambiental
- [ ] 2. Agregar hemispheric light
- [ ] 3. Agregar point lights por habitación
- [ ] 4. Agregar spotlight para Answer Wall
- [ ] 5. Agregar luz exterior cerca de ventanas
- [ ] 6. Revisar materiales oscuros

### Definition of Done

- El mapa ya no se ve oscuro
- Zombies se ven claramente
- Paredes y puertas son legibles
- Answer Wall se lee sin esfuerzo

---

## Fase 3 — Materiales y Paredes

**Objetivo:** Las habitaciones deben dejar de parecer cajas negras vacías. Cada habitación debe tener identidad visual propia, sin usar assets externos.

### Paredes tipo ladrillo

Crear material procedural usando `DynamicTexture` o canvas.

Módulo nuevo:

```
/src/environment/materials/BrickMaterialFactory.ts
```

API propuesta:

```ts
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

### Paredes pintadas

Agregar paredes con base clara y franja de color:

```
Parte superior: gris claro / beige
Franja media:   azul, verde o naranja
Parte inferior: gris más oscuro
```

Implementación con tres cajas delgadas superpuestas, textura procedural, o planos decorativos pegados a la pared.

### Tareas

- [ ] 1. Crear material de ladrillo procedural (`BrickMaterialFactory.ts`)
- [ ] 2. Crear material de pared pintada
- [ ] 3. Aplicar paredes más claras en todas las habitaciones
- [ ] 4. Agregar franjas de color
- [ ] 5. Agregar variación visual entre habitaciones

### Definition of Done

- Habitaciones no parecen cajas negras vacías
- Cada habitación tiene identidad visual
- No se usaron assets externos

---

## Fase 4 — Decoración

**Objetivo:** Cada habitación debe tener decoración mínima que la haga sentir viva, sin bloquear el gameplay ni impedir ver zombies.

### Módulo nuevo

```
/src/environment/RoomDecorator.ts
```

API:

```ts
class RoomDecorator {
  constructor(scene: BABYLON.Scene, materials: EnvironmentMaterials)

  decorateMainRoom(room: RoomBounds): void
  decorateLeftRoom(room: RoomBounds): void
  decorateRightRoom(room: RoomBounds): void
}
```

### Decoración por habitación

#### Habitación principal — Centro de defensa

- Answer Wall iluminado
- Dos ventanas de entrada
- Luces de techo
- Weapon wall buys
- Carteles
- Columnas
- Piso con marcas
- Paredes parcialmente pintadas y ladrillos

#### Habitación lateral izquierda — Más abierta

- Una ventana grande
- Crates
- Luz fría exterior
- Shotgun o SMG wall buy
- Tuberías
- Poster o señal

#### Habitación lateral derecha — Estrecha y peligrosa

- Una ventana pequeña
- Luz parpadeante (opcional)
- Machine gun wall buy
- Pasillo angosto
- Panel eléctrico
- Tuberías bajas

### Elementos decorativos generales

Agregar con boxes y primitives:

- Tuberías en techo y paredes
- Lámparas rectangulares
- Paneles eléctricos
- Señales de salida
- Carteles de estación
- Posters educativos
- Bancos simples
- Cajas/crates
- Columnas con franjas
- Marcas en el piso

### Tareas

- [ ] 1. Crear `RoomDecorator.ts`
- [ ] 2. Agregar luces visibles (lámparas de techo)
- [ ] 3. Agregar pipes
- [ ] 4. Agregar carteles
- [ ] 5. Agregar posters
- [ ] 6. Agregar crates
- [ ] 7. Agregar paneles eléctricos
- [ ] 8. Agregar marcas de piso

### Definition of Done

- Cada habitación tiene decoración mínima
- Decoración no bloquea el gameplay
- Decoración no impide ver zombies

---

## Fase 5 — WindowBuilder

**Objetivo:** Crear ventanas visibles con marcos y aberturas reales, usando piezas de boxes (no boolean cutting).

### Estructura de una ventana

```
[ Exterior Spawn ] ---> [ Window Approach ] ---> [ Climb Window ] ---> [ Inside Landing ] ---> [ Chase Player ]
```

### Construcción con boxes

```
┌─────────────────────┐
│      top wall       │
├──────┐       ┌──────┤
│ left │window │right │
│ wall │ hole  │wall  │
├──────┘       └──────┘
│     bottom wall     │
└─────────────────────┘
```

Piezas:
- Caja superior
- Caja inferior
- Caja izquierda
- Caja derecha
- Marco de ventana
- Plano transparente o sin vidrio

### Módulo nuevo

```
/src/environment/WindowBuilder.ts
```

### Tipo: WindowEntryPoint

```ts
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

### Distribución de ventanas (mínimo requerido)

| Habitación | Ventanas | Total |
|------------|----------|-------|
| Principal | Norte izquierda + Norte derecha | 2 |
| Lateral izquierda | Ventana grande | 1 |
| Lateral derecha | Ventana pequeña | 1 |
| **Total** | | **4** |

### Tareas

- [ ] 1. Crear paredes con aberturas usando boxes
- [ ] 2. Crear marcos de ventana
- [ ] 3. Definir `WindowEntryPoint` por cada ventana
- [ ] 4. Agregar 4 ventanas mínimas
- [ ] 5. Agregar luz exterior por ventana

### Definition of Done

- Las habitaciones tienen ventanas visibles
- Las ventanas tienen puntos de entrada definidos
- El jugador puede ver hacia la zona exterior

---

## Fase 6 — Window Spawn System

**Objetivo:** Los zombies deben aparecer afuera del edificio, caminar hacia ventanas y entrar por ellas. Nunca aparecer mágicamente dentro.

### Estados del zombie

```ts
type ZombieState =
  | "outside_approaching"
  | "climbing_window"
  | "inside_chasing"
  | "attacking"
  | "dead"
```

### Comportamiento por estado

#### `outside_approaching`
- Zombie camina desde afuera hacia la ventana
- Puede recibir disparos
- Si muere afuera, nunca entra

#### `climbing_window`
- Zombie trepa lentamente sobre el marco
- Velocidad reducida
- Puede recibir disparos
- Al terminar, transiciona a `inside_chasing`

#### `inside_chasing`
- Zombie persigue al jugador normalmente

#### `attacking`
- Zombie daña al jugador si está cerca

#### `dead`
- Zombie deja de moverse y atacar

### Módulos nuevos

```
/src/spawning/SpawnDirector.ts
/src/spawning/WindowSpawnPoint.ts
/src/spawning/ZombieSpawnPlan.ts
/src/enemies/ZombieWindowEntryController.ts
```

### SpawnDirector

```ts
class SpawnDirector {
  constructor(entryPoints: WindowEntryPoint[])

  createSpawnPlan(round: number, options: AnswerOption[]): ZombieSpawnPlan[]
}
```

```ts
interface ZombieSpawnPlan {
  optionId: string
  entryPointId: string
  delayMs: number
}
```

Responsabilidades:
- Decidir cuántos zombies spawnear
- Asignar zombies a ventanas
- Escalonar tiempos de spawn (no todos al mismo tiempo)
- Evitar que todos aparezcan simultáneamente

### Regla educativa

- Al menos 1 zombie por opción A/B/C/D
- Los zombies extra duplican opciones **incorrectas**
- Nunca duplicar la opción correcta en v0.3

### Tareas

- [ ] 1. Crear `WindowEntryPoint` y `WindowSpawnPoint.ts`
- [ ] 2. Crear `SpawnDirector.ts`
- [ ] 3. Spawnear zombies afuera del edificio
- [ ] 4. Mover zombies hacia la ventana asignada
- [ ] 5. Permitir disparar antes de que entren
- [ ] 6. Transicionar estado a `climbing_window`
- [ ] 7. Transicionar estado a `inside_chasing`

### Definition of Done

- Zombies ya no aparecen mágicamente dentro
- Zombies vienen desde afuera
- Zombies pueden ser matados antes de entrar
- Zombies entran por ventanas

---

## Fase 7 — Climb Animation

**Objetivo:** Los zombies deben parecer que trepan por la ventana. Animación simple sin skeletons.

### Implementación

Durante el estado `climbing_window`:

```ts
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

### Comportamiento de la animación

- Torso se inclina hacia adelante
- Brazos suben
- Piernas alternan posición (seno)
- Root se mueve de `climbStartPosition` a `climbEndPosition`
- Al terminar, cae o baja hacia `insideLandingPosition`
- Transiciona a `inside_chasing`

### Módulo nuevo

```
/src/enemies/ZombieAnimator.ts
```

### Tareas

- [ ] 1. Crear estado `climbing_window` en la máquina de estados
- [ ] 2. Implementar `updateClimbAnimation()` en `ZombieAnimator.ts`
- [ ] 3. Animar torso, brazos y piernas con rotaciones
- [ ] 4. Mover root por interpolación (Lerp)
- [ ] 5. Terminar en `insideLandingPosition`
- [ ] 6. Cambiar estado a `inside_chasing`

### Definition of Done

- Zombie parece trepar
- Puede recibir disparos mientras trepa
- Luego persigue al jugador normalmente

---

## Estructura de archivos final

```
/src/environment
  SubwayStationBuilder.ts
  RoomBuilder.ts
  RoomDecorator.ts          ← Fase 4
  WindowBuilder.ts          ← Fase 5
  DoorBuilder.ts
  Materials.ts
  BrickMaterialFactory.ts   ← Fase 3
  LightFactory.ts           ← Fase 2

/src/spawning
  SpawnDirector.ts          ← Fase 6
  WindowSpawnPoint.ts       ← Fase 6
  ZombieSpawnPlan.ts        ← Fase 6

/src/enemies
  BoxZombie.ts
  ZombieAnimator.ts         ← Fase 7
  ZombieWindowEntryController.ts  ← Fase 6
  ZombieState.ts            ← Fase 6

/src/ui
  Hud.ts
  Crosshair.ts
```

> Si existe `/src/ui3d/AimTooltip.ts`, eliminarlo o dejarlo sin uso. ← **Fase 1**

---

## Criterios de Aceptación v0.3

v0.3 está completa cuando:

- [x] Habitaciones tienen más luz
- [x] Paredes ya no son demasiado oscuras
- [x] Existen paredes tipo ladrillo o pintadas
- [x] Existen decoraciones simples en cada habitación
- [x] El Answer Wall sigue visible en la habitación principal
- [x] Los zombies vienen desde afuera
- [x] Los zombies entran por ventanas
- [x] El jugador puede matar zombies antes de que entren
- [x] Los zombies tienen animación simple de trepar
- [x] No aparecen hints al apuntar
- [x] No se revela si un zombie es correcto/incorrecto al apuntar
- [x] Labels A/B/C/D siguen visibles
- [x] El gameplay sigue funcionando por rounds

---

## Nota de diseño

Remover las hints hace que el juego sea más justo como desafío educativo.

El flujo mental correcto del jugador:

```
1. Leo la pregunta.
2. Leo las opciones en la pared.
3. Recuerdo cuál letra corresponde a cada respuesta.
4. Identifico zombies por A/B/C/D.
5. Decido cuáles eliminar.
```

**No debe ser:**

```
1. Apunto al zombie.
2. El juego me dice si es correcto o incorrecto.
3. Disparo.
```

La pared de respuestas es la fuente de información. El arma **no debe convertirse en un detector de respuestas**.
