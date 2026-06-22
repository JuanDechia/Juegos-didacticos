# Plan de Implementación — EduArena 3D MVP
## Zombie Quiz Arena — Geography Edition

Stack: **Babylon.js + TypeScript + Vite** | Contenido: **JSON local** | Tests: **Vitest**

---

## Resumen de Fases

| Fase | Nombre | Qué entrega |
|------|--------|-------------|
| 0 | Setup del proyecto | Proyecto corriendo en navegador con escena vacía |
| 1 | Tipos educativos y carga de contenido | Pregunta cargada desde JSON, evaluador con tests |
| 2 | Construcción del mapa | Estación de metro navegable en 3D |
| 3 | AnswerBoard 3D | Pregunta y opciones visibles dentro del mundo |
| 4 | Controlador FPS | Movimiento WASD + cámara mouse + pointer lock |
| 5 | Arma y raycast | Disparo que detecta enemigos |
| 6 | Enemigos | 4 enemigos A/B/C/D que persiguen al jugador |
| 7 | Modo de juego FPS Elimination | Loop completo: victoria, derrota, feedback |
| 8 | Polish visual y UX | Crosshair, tooltips, pantalla inicio/fin, iluminación |
| 9 | QA y validación | Estabilidad, build de producción |

---

## Fase 0 — Setup del proyecto

### Objetivo
Crear la base del proyecto con Babylon.js, TypeScript y Vite. El canvas debe renderizar una escena básica en navegador.

### Tareas
1. Inicializar proyecto Vite con template TypeScript en `./`
2. Instalar dependencias: `@babylonjs/core`, `@babylonjs/gui`
3. Configurar ESLint + Prettier
4. Configurar Vitest
5. Crear estructura de carpetas según PRD §13.1
6. Crear `index.html` con `<canvas>` fullscreen
7. Crear `main.ts` con render loop básico
8. Verificar escena vacía visible con cámara y luz de prueba

### Archivos a crear
#### [NEW] `index.html`
#### [NEW] `src/main.ts`
#### [NEW] `src/GameApp.ts`
#### [NEW] `tsconfig.json`
#### [NEW] `vite.config.ts`
#### [NEW] `vitest.config.ts`
#### [NEW] `.eslintrc` / `eslint.config.js`
#### [NEW] `.prettierrc`
#### [NEW] `package.json`

### Estructura de carpetas
```
/src
  main.ts
  GameApp.ts
  /core
  /content/lessons/
  /education
  /gameplay
  /environment
  /ui
  /ui3d
  /utils
/tests
```

### Definition of Done
- `npm run dev` → navegador muestra escena 3D
- `npm run build` → sin errores TypeScript
- `npm run test` → Vitest instalado y corriendo (0 tests = OK)

---

## Fase 1 — Tipos educativos y carga de contenido

### Objetivo
Implementar el modelo de datos de pregunta y el loader JSON. Separar completamente la lógica educativa de Babylon.js.

### Tareas
1. Crear `src/education/types.ts` con `Question`, `AnswerOption`, `GameResult`, `GameConfig`
2. Crear `src/content/lessons/geography.france.json` con pregunta inicial
3. Crear `src/education/QuestionLoader.ts` — carga y valida JSON
4. Crear `src/education/QuestionEvaluator.ts` — identifica correcta/incorrectas
5. Crear `tests/QuestionEvaluator.test.ts` con casos de prueba

### Archivos a crear
#### [NEW] [`types.ts`](file:///c:/Users/angel/Juegos-didacticos/src/education/types.ts)
#### [NEW] [`geography.france.json`](file:///c:/Users/angel/Juegos-didacticos/src/content/lessons/geography.france.json)
#### [NEW] [`QuestionLoader.ts`](file:///c:/Users/angel/Juegos-didacticos/src/education/QuestionLoader.ts)
#### [NEW] [`QuestionEvaluator.ts`](file:///c:/Users/angel/Juegos-didacticos/src/education/QuestionEvaluator.ts)
#### [NEW] [`QuestionEvaluator.test.ts`](file:///c:/Users/angel/Juegos-didacticos/tests/QuestionEvaluator.test.ts)

### Contratos clave

```ts
// education/types.ts
export interface Question { id, subject, lessonId, prompt, type, options, explanation, difficulty }
export interface AnswerOption { id, enemyLabel, boardText, fullText, isCorrect? }
export interface GameResult { questionId, status, correctOptionId, eliminatedOptionIds, ... }
export interface GameConfig { strictCorrectKillGameOver, playerHealth, enemyDamage, ... }

// education/QuestionEvaluator.ts
class QuestionEvaluator {
  getCorrectOption(): AnswerOption
  isCorrectOption(id: string): boolean
  isIncorrectOption(id: string): boolean
  getIncorrectOptionIds(): string[]
}
```

> [!IMPORTANT]
> `QuestionEvaluator` **NO debe importar nada de Babylon.js**. Debe ser 100% testeable sin render.

### Definition of Done
- `npm run test` pasa con ≥ 5 casos
- Cambiar `geography.france.json` cambia el juego sin tocar lógica
- Falla controlada si no hay `isCorrect: true` en ninguna opción

---

## Fase 2 — Construcción del mapa

### Objetivo
Crear la estación de metro subterránea usando solo primitives de Babylon.js. Sin assets externos.

### Tareas
1. Crear `src/environment/Materials.ts` — materiales reutilizables (gris, oscuro, metálico)
2. Crear `src/environment/Lights.ts` — iluminación básica de estación subterránea
3. Crear `src/environment/SubwayStationBuilder.ts` con:
   - Piso rectangular
   - Paredes laterales
   - Techo bajo
   - Columnas (mínimo 4)
   - Túneles laterales (decorativos)
   - Andén y vías
   - Zona segura inicial (detrás del jugador)
   - Arena de combate (adelante)
   - Anchor mesh para `AnswerBoard`
   - 4 spawn points de enemigos
4. Integrar en `GameApp.ts`

### Archivos a crear
#### [NEW] [`Materials.ts`](file:///c:/Users/angel/Juegos-didacticos/src/environment/Materials.ts)
#### [NEW] [`Lights.ts`](file:///c:/Users/angel/Juegos-didacticos/src/environment/Lights.ts)
#### [NEW] [`SubwayStationBuilder.ts`](file:///c:/Users/angel/Juegos-didacticos/src/environment/SubwayStationBuilder.ts)

### API esperada

```ts
interface SubwayStationBuildResult {
  playerSpawn: BABYLON.Vector3;
  enemySpawns: BABYLON.Vector3[];      // exactamente 4 posiciones
  answerBoardAnchor: BABYLON.AbstractMesh;
}

function buildSubwayStation(scene: BABYLON.Scene): SubwayStationBuildResult
```

### Definition of Done
- Escena tiene identidad visual de estación de metro
- No usa assets externos (0 archivos `.glb`, `.obj`, `.png`)
- Geometría limpia: piso, paredes, techo, columnas visibles
- Hay exactamente 4 spawn points distintos para enemigos
- El anchor para `AnswerBoard` está bien ubicado en pared frontal

---

## Fase 3 — AnswerBoard 3D

### Objetivo
Mostrar pregunta y opciones como texto dentro del mundo 3D usando `@babylonjs/gui` o `DynamicTexture`.

### Tareas
1. Crear `src/ui3d/AnswerBoard.ts`
2. Panel de pregunta (pared principal): materia + pregunta completa
3. Panel de opciones (pared lateral): A/B/C/D con `boardText`
4. Implementar texto con wrapping y alto contraste (fondo oscuro, texto blanco/amarillo)
5. Implementar `markOptionEliminated(optionId)` — tachar o colorear diferente
6. Implementar `highlightOption(optionId)` — resaltar al apuntar
7. Implementar `showResult(correctOptionId, explanation)` — pantalla post-game en pared

### Archivos a crear
#### [NEW] [`AnswerBoard.ts`](file:///c:/Users/angel/Juegos-didacticos/src/ui3d/AnswerBoard.ts)

### API completa

```ts
class AnswerBoard {
  constructor(scene: BABYLON.Scene, anchor: BABYLON.AbstractMesh)
  setQuestion(question: Question): void
  highlightOption(optionId: string | null): void
  markOptionEliminated(optionId: string): void
  showResult(correctOptionId: string, explanation: string): void
  dispose(): void
}
```

### Definition of Done
- Jugador puede leer pregunta desde la zona de inicio (sin HUD)
- Opciones permanecen visibles durante combate
- Texto no desborda el panel (wrapping correcto)
- Opciones eliminadas visualmente marcadas (strikethrough o color rojo/gris)

---

## Fase 4 — Controlador FPS

### Objetivo
Permitir al jugador moverse libremente y controlar la cámara en primera persona.

### Tareas
1. Crear `src/core/InputManager.ts` — singleton de teclado y mouse
2. Crear `src/gameplay/PlayerController.ts` con:
   - Pointer lock al hacer click en canvas
   - `Esc` libera pointer lock
   - Mouse look (yaw + pitch limitado)
   - WASD movement (velocidad: 5 u/s)
   - Gravedad simple (mantener Y constante sobre el piso)
   - Colisión básica con paredes
   - Sistema de salud (HP: 100)
3. Crear `src/ui/Hud.ts` — HUD mínimo overlay HTML con salud y objetivos

### Archivos a crear
#### [NEW] [`InputManager.ts`](file:///c:/Users/angel/Juegos-didacticos/src/core/InputManager.ts)
#### [NEW] [`PlayerController.ts`](file:///c:/Users/angel/Juegos-didacticos/src/gameplay/PlayerController.ts)
#### [NEW] [`Hud.ts`](file:///c:/Users/angel/Juegos-didacticos/src/ui/Hud.ts)

### Propiedades del jugador
```ts
player = {
  health: 100,
  moveSpeed: 5,
  sprintSpeed: 8,
  lookSensitivity: 0.002,
  weaponCooldownMs: 250
}
```

### Definition of Done
- Movimiento WASD fluido a 60fps
- Mouse controla la cámara correctamente
- `Esc` libera el mouse
- Salud visible en HUD
- Jugador no atraviesa paredes en condiciones normales

---

## Fase 5 — Arma y raycast

### Objetivo
Permitir al jugador disparar usando raycast desde la cámara hacia el centro de la pantalla.

### Tareas
1. Crear `src/gameplay/WeaponController.ts` con:
   - Detección de click izquierdo
   - Cooldown de 250ms entre disparos
   - Raycast desde cámara al centro del canvas
   - Filtrar hits: solo meshes con tag `"enemy"`
   - Emitir evento `onEnemyHit(enemyId: string)`
   - Contador de disparos realizados y de hits
2. Agregar crosshair simple al HUD (punto central)
3. Feedback visual de disparo (flash breve en pantalla o efecto de muzzle)

### Archivos a crear
#### [NEW] [`WeaponController.ts`](file:///c:/Users/angel/Juegos-didacticos/src/gameplay/WeaponController.ts)
#### [MODIFY] [`Hud.ts`](file:///c:/Users/angel/Juegos-didacticos/src/ui/Hud.ts) — agregar crosshair

### Definition of Done
- Click izquierdo dispara (con cooldown)
- Raycast detecta solo meshes de enemigos
- Paredes, piso y paneles no son detectados
- Contador de disparos y hits funcionan correctamente

---

## Fase 6 — Enemigos

### Objetivo
Crear 4 enemigos (uno por opción A/B/C/D) con comportamiento de persecución y label flotante.

### Tareas
1. Crear `src/gameplay/Enemy.ts` — clase de enemigo individual
2. Crear `src/gameplay/EnemySpawner.ts` — crea enemigos desde opciones de pregunta
3. Crear `src/gameplay/EnemyRegistry.ts` — registro de enemigos vivos
4. Crear `src/ui3d/FloatingLabel.ts` — label billboard sobre enemigo
5. Comportamiento del enemigo:
   - Mesh: `BoxBuilder` con color asignado por opción
   - Movimiento hacia el jugador (velocidad: 1.5 u/s)
   - Daño al jugador por proximidad (10 HP)
   - Muerte al recibir hit
   - Evento `onKilled` con `optionId`

### Archivos a crear
#### [NEW] [`Enemy.ts`](file:///c:/Users/angel/Juegos-didacticos/src/gameplay/Enemy.ts)
#### [NEW] [`EnemySpawner.ts`](file:///c:/Users/angel/Juegos-didacticos/src/gameplay/EnemySpawner.ts)
#### [NEW] [`EnemyRegistry.ts`](file:///c:/Users/angel/Juegos-didacticos/src/gameplay/EnemyRegistry.ts)
#### [NEW] [`FloatingLabel.ts`](file:///c:/Users/angel/Juegos-didacticos/src/ui3d/FloatingLabel.ts)

### Contrato del enemigo
```ts
export interface EnemyInstance {
  id: string;
  optionId: string;          // "A" | "B" | "C" | "D"
  mesh: BABYLON.AbstractMesh;
  isAlive: boolean;
  kill(): void;
  dispose(): void;
  onKilled: Observable<string>;  // emite optionId
}
```

### Propiedades del enemigo
```ts
enemy = {
  health: 1,
  moveSpeed: 1.5,
  damage: 10,
  damageRadius: 1.2     // distancia para aplicar daño
}
```

### Definition of Done
- 4 enemigos spawneados en las posiciones del mapa
- Cada uno tiene label A/B/C/D visible y billboard
- Cada uno se mueve hacia el jugador
- Al recibir disparo, mueren y emiten `optionId`
- Al acercarse al jugador, le restan HP

---

## Fase 7 — Modo de juego FPS Elimination

### Objetivo
Integrar todos los sistemas y orquestar el loop completo del juego: intro → lectura → combate → victoria/derrota → feedback.

### Tareas
1. Crear `src/gameplay/FpsEliminationMode.ts` con máquina de estados
2. Conectar `QuestionEvaluator` con eventos de muerte de enemigos
3. Implementar lógica de victoria y derrota
4. Crear `src/ui/EndScreen.ts` — pantalla final HTML overlay
5. Crear `src/ui/StartScreen.ts` — pantalla de inicio HTML overlay
6. Implementar reinicio con tecla `R` y botón "Play Again"
7. Agregar tests para `FpsEliminationMode`

### Archivos a crear
#### [NEW] [`FpsEliminationMode.ts`](file:///c:/Users/angel/Juegos-didacticos/src/gameplay/FpsEliminationMode.ts)
#### [NEW] [`StartScreen.ts`](file:///c:/Users/angel/Juegos-didacticos/src/ui/StartScreen.ts)
#### [NEW] [`EndScreen.ts`](file:///c:/Users/angel/Juegos-didacticos/src/ui/EndScreen.ts)
#### [NEW] [`FpsEliminationMode.test.ts`](file:///c:/Users/angel/Juegos-didacticos/tests/FpsEliminationMode.test.ts)

### Máquina de estados
```ts
type GameState = "intro" | "reading" | "playing" | "won" | "lost"
```

### Flujo de estados
```
intro (StartScreen) 
  → [Start] → reading (3s pausa para leer)
  → [auto] → playing (enemigos activos)
  → [victoria/derrota] → won/lost (EndScreen + feedback)
  → [R / Play Again] → intro
```

### Pseudocódigo central
```ts
on enemy killed (optionId):
  if evaluator.isCorrectOption(optionId):
    if config.strictCorrectKillGameOver: endGame("lost")
  else:
    answerBoard.markOptionEliminated(optionId)
    if all incorrect eliminated: endGame("won")

on player health <= 0: endGame("lost")
```

### Definition of Done
- Eliminar A, C, D → victoria (B queda vivo)
- Eliminar B → derrota inmediata
- HP ≤ 0 → derrota
- EndScreen muestra: respuesta correcta + explicación + tiempo + precisión
- Reinicio limpia el estado completamente
- `npm run test` pasa todos los tests del evaluador y modo de juego

---

## Fase 8 — Polish visual y UX

### Objetivo
Mejorar la claridad, la legibilidad y la primera impresión del juego sin cambiar la arquitectura.

### Tareas
1. **Iluminación** — Agregar luces de punto en paneles, luz ambiental tenue, efecto de neón
2. **AimTooltip** — Crear `src/ui3d/AimTooltip.ts`: tooltip HTML que aparece al apuntar enemigo (`B — París`)
3. **Feedback al eliminar incorrecta** — Flash verde + texto "¡Correcto!" breve
4. **Advertencia al apuntar correcta** — Contorno rojo / color del crosshair cambia
5. **Pantalla de inicio mejorada** — Título, materia, instrucciones breves, botón Start
6. **Pantalla final mejorada** — Victoria/derrota con colores, stats (tiempo, precisión, disparos)
7. **HUD mejorado** — Objetivo actual ("Elimina A, C, D — Protege B"), HP visual, contador de incorrectas
8. **Sonidos opcionales** — Usar Web Audio API para efecto de disparo y victoria/derrota (sin assets externos)
9. **Ajuste de tamaños de texto** — Verificar legibilidad desde 5 unidades de distancia

### Archivos a crear/modificar
#### [NEW] [`AimTooltip.ts`](file:///c:/Users/angel/Juegos-didacticos/src/ui3d/AimTooltip.ts)
#### [MODIFY] [`Hud.ts`](file:///c:/Users/angel/Juegos-didacticos/src/ui/Hud.ts)
#### [MODIFY] [`StartScreen.ts`](file:///c:/Users/angel/Juegos-didacticos/src/ui/StartScreen.ts)
#### [MODIFY] [`EndScreen.ts`](file:///c:/Users/angel/Juegos-didacticos/src/ui/EndScreen.ts)
#### [MODIFY] [`Lights.ts`](file:///c:/Users/angel/Juegos-didacticos/src/environment/Lights.ts)

### Definition of Done
- Un usuario nuevo puede jugar sin explicación verbal
- El objetivo queda claro en ≤ 10 segundos de jugar
- Feedback positivo y negativo inmediato y legible

---

## Fase 9 — QA y validación

### Objetivo
Asegurar estabilidad y generar build de producción válido.

### Checklist de pruebas
- [ ] Probar en Chrome (última versión)
- [ ] Probar en Edge
- [ ] Probar en Firefox
- [ ] Resize de ventana no rompe canvas ni HUD
- [ ] Reinicio limpia estado correctamente (sin memory leaks visibles)
- [ ] Victoria: eliminar A, C, D → mensaje de victoria + explicación
- [ ] Derrota por correcta: eliminar B → derrota inmediata
- [ ] Derrota por HP: dejar que enemigos lleguen al jugador → HP 0 → derrota
- [ ] Textos largos no desbordan paneles
- [ ] 60 FPS en escena completa (DevTools Performance)
- [ ] 0 errores críticos en consola del navegador
- [ ] `npm run build` exitoso
- [ ] `npm run typecheck` sin errores
- [ ] `npm run test` todos los tests pasan

### Entregable final
- Build de producción en `/dist`
- Checklist QA completado y documentado

### Definition of Done (MVP completo)
Todos los ítems del §23 del PRD marcados como completados.

---

## Decisiones confirmadas

> [!NOTE]
> **✅ Sonidos** → Usar **Web Audio API** (síntesis procedural, sin archivos externos). Efectos para: disparo, eliminación correcta, eliminación incorrecta, victoria, derrota.

> [!NOTE]
> **✅ Física / Gravedad** → Posición **Y fija** para este juego (jugador siempre sobre el plano). La arquitectura del `PlayerController` dejará un punto de extensión para que futuros juegos puedan conectar un sistema de física real (Cannon.js, Ammo.js, etc.).

> [!NOTE]
> **✅ Colisiones con paredes** → Usar `checkCollisions` nativo de Babylon.js para el MVP.

> [!NOTE]
> Se implementará una fase a la vez en el orden establecido. Cada fase debe pasar su Definition of Done antes de avanzar a la siguiente.
