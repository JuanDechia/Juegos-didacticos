# PRD v0.1 — Plataforma de Juegos Didácticos 3D en Navegador

## 1. Nombre provisional del producto

**EduArena 3D**

Nombre interno del primer juego/MVP:

**Zombie Quiz Arena — Geography Edition**

---

## 2. Resumen ejecutivo

EduArena 3D es una plataforma de juegos didácticos en navegador donde estudiantes aprenden y practican contenidos escolares mediante mini-juegos 3D interactivos. Cada juego se genera a partir de una lección y una pregunta educativa. El estudiante debe resolver la pregunta a través de una mecánica jugable: eliminar enemigos con respuestas incorrectas, proteger la respuesta correcta, ordenar pasos, emparejar conceptos o completar objetivos dentro de un mapa 3D.

El primer MVP será un juego FPS simple en navegador. El jugador aparece dentro de una estación de metro subterránea construida con geometría básica: cajas, planos, paredes, luces y materiales simples. Al comenzar, se muestra una pregunta educativa en una pared grande del escenario. Las opciones completas permanecen visibles durante todo el juego en paneles colocados dentro del ambiente. Los enemigos son cubos o cajas animadas de forma simple, cada uno con un código visible sobre la cabeza: A, B, C o D. El jugador debe destruir todos los enemigos que representen respuestas incorrectas y evitar destruir el enemigo que representa la respuesta correcta.

La primera versión usará **Babylon.js + TypeScript + Vite**, con contenido cargado desde archivos JSON locales. No se utilizarán assets 3D externos en el MVP; toda la geometría será procedural o construida con primitives básicas.

---

## 3. Problema que resuelve

La educación digital suele caer en dos extremos:

1. contenido pasivo: videos, lecturas, PDFs, slides;
2. quizzes tradicionales: preguntas de opción múltiple sin contexto emocional ni interacción.

EduArena 3D busca combinar práctica educativa con acción, exploración y toma de decisiones dentro de mundos 3D simples. El objetivo no es reemplazar la enseñanza, sino convertir la práctica y evaluación formativa en una experiencia más activa, memorable y atractiva.

---

## 4. Objetivo del producto

Crear una plataforma web donde cualquier lección pueda transformarse en una experiencia jugable 3D.

Para el MVP, el objetivo es demostrar que se puede:

* cargar una pregunta educativa desde JSON;
* generar un mapa 3D simple en navegador;
* mostrar pregunta y opciones completas dentro del mundo;
* representar opciones con enemigos etiquetados A/B/C/D;
* permitir al jugador moverse, apuntar y disparar;
* evaluar si destruyó respuestas incorrectas o correctas;
* mostrar feedback educativo;
* finalizar el juego con victoria o derrota;
* tener una arquitectura extensible para futuros tipos de preguntas y modos de juego.

---

## 5. Público objetivo

### Usuario principal

**Estudiantes** de primaria alta, secundaria o cursos introductorios.

### Usuarios secundarios

**Docentes**, tutores, padres o creadores de contenido educativo que quieran convertir lecciones en experiencias interactivas.

### Usuario técnico interno

**Agentes de inteligencia artificial y desarrolladores** que implementarán nuevos modos de juego, mapas, preguntas y sistemas sobre una arquitectura code-first.

---

## 6. Principios de diseño

### 6.1 Code-first

El proyecto debe poder ser entendido, modificado y extendido por agentes de IA leyendo archivos TypeScript y JSON. No debe depender de un editor visual obligatorio.

### 6.2 Navegador primero

El juego debe correr en navegador moderno sin instalación.

### 6.3 Geometría simple, buena composición

El MVP no usará assets 3D externos. Los escenarios se construirán con cajas, planos, luces, colores, materiales simples y diseño modular.

### 6.4 Texto educativo siempre visible

La pregunta y las opciones completas deben estar visibles dentro del mundo del juego, preferentemente en paredes, paneles, pantallas o carteles.

### 6.5 Enemigos con códigos, no textos largos

Los enemigos mostrarán etiquetas cortas: A, B, C, D. El texto completo estará en las paredes/paneles del ambiente.

### 6.6 Feedback educativo obligatorio

Cada victoria o error debe mostrar una explicación educativa. El juego no debe limitarse a decir “correcto” o “incorrecto”.

### 6.7 Modularidad

El sistema debe separar claramente:

* contenido educativo;
* generación del mapa;
* lógica de juego;
* evaluación de respuestas;
* UI/HUD;
* enemigos;
* controles;
* feedback.

---

## 7. Decisión tecnológica

### Stack elegido

* **Babylon.js**
* **TypeScript**
* **Vite**
* **HTML/CSS**
* **JSON local para contenido del MVP**
* **Vitest para tests unitarios**
* **ESLint/Prettier para calidad de código**

### Razón de la elección

Babylon.js + TypeScript es apropiado porque:

* corre bien en navegador;
* permite arquitectura code-first;
* es más fácil para agentes de IA generar y modificar código;
* permite crear escenas, geometría, UI 3D y lógica de juego desde TypeScript;
* facilita versionar mapas, preguntas y modos de juego como código;
* evita depender de un editor visual externo;
* permite producir experiencias 3D de buena calidad usando primitives, luces, materiales y UI diegética.

---

## 8. Alcance del MVP

### Incluido en MVP

El MVP incluye un único juego:

**FPS educativo en una estación de metro subterránea.**

Materia inicial:

**Geografía**

Pregunta inicial:

**¿Cuál es la capital de Francia?**

Opciones:

* A — Berlín
* B — París
* C — Brasilia
* D — Roma

Respuesta correcta:

* B — París

Gameplay:

* El jugador aparece en una zona segura.
* En una pared principal aparece la pregunta.
* En otra pared o panel grande aparecen todas las opciones.
* Las opciones completas permanecen visibles durante todo el juego.
* Los enemigos aparecen con etiquetas A, B, C y D.
* El jugador debe destruir enemigos con respuestas incorrectas.
* El jugador debe evitar destruir el enemigo con la respuesta correcta.
* Si destruye todos los enemigos incorrectos y la respuesta correcta queda viva, gana.
* Si destruye la respuesta correcta, pierde o recibe penalización severa según configuración.
* Al terminar, se muestra feedback educativo.

### No incluido en MVP

* backend real;
* login;
* dashboard docente;
* editor visual de preguntas;
* multiplayer;
* mobile touch controls avanzados;
* VR;
* assets 3D externos;
* IA generativa en runtime;
* corrección de respuestas abiertas;
* sincronización con LMS;
* monetización;
* analíticas avanzadas.

---

## 9. Experiencia del usuario

### 9.1 Flujo principal

1. El estudiante abre el juego en navegador.
2. Aparece pantalla de inicio:

   * título;
   * materia;
   * botón “Start”.
3. Al iniciar, aparece dentro de una estación de metro.
4. Frente al jugador hay una pared con la pregunta.
5. A la derecha o izquierda hay un panel grande con opciones A/B/C/D.
6. El jugador puede moverse y mirar alrededor.
7. Después de unos segundos, los enemigos aparecen.
8. Cada enemigo tiene un label visible:

   * A;
   * B;
   * C;
   * D.
9. El jugador dispara a los enemigos incorrectos.
10. Si elimina una opción incorrecta, recibe feedback visual positivo breve.
11. Si dispara o elimina la opción correcta, recibe error.
12. Al finalizar:

* victoria si la opción correcta queda viva y las incorrectas fueron eliminadas;
* derrota si destruye la correcta o pierde toda la vida.

13. El juego muestra:

* respuesta correcta;
* explicación;
* tiempo;
* precisión;
* botón “Play Again”.

---

## 10. Diseño del primer juego

### 10.1 Nombre

**Zombie Quiz Arena — Geography Edition**

### 10.2 Modo

**FPS Elimination Mode**

### 10.3 Ambiente

**Estación de metro subterránea**

Componentes del mapa:

* piso rectangular;
* paredes laterales;
* techo bajo;
* columnas;
* túneles laterales;
* andén;
* vías;
* paneles luminosos;
* zona segura inicial;
* arena de combate;
* panel principal de pregunta;
* paneles secundarios de opciones.

### 10.4 Estilo visual

* Low-poly / blockout limpio.
* Geometría basada en cajas.
* Colores sobrios.
* Buena iluminación.
* Alto contraste para textos.
* Sin gore.
* Enemigos tipo “infected cubes” o “corrupted blocks”, no zombies realistas.

### 10.5 Cámara y controles

Controles desktop:

* `WASD`: mover;
* mouse: mirar;
* click izquierdo: disparar;
* `R`: reiniciar;
* `Esc`: liberar mouse pointer lock;
* `Tab` o `Q`: mostrar/ocultar HUD de ayuda opcional.

### 10.6 Jugador

Propiedades iniciales:

```ts
player = {
  health: 100,
  moveSpeed: 5,
  sprintSpeed: 8,
  lookSensitivity: 0.002,
  weaponCooldownMs: 250
}
```

### 10.7 Enemigos

Para el MVP, los enemigos serán cajas con comportamiento simple.

Propiedades:

```ts
enemy = {
  id: string,
  optionId: "A" | "B" | "C" | "D",
  isCorrectAnswer: boolean,
  health: 1,
  moveSpeed: 1.5,
  damage: 10,
  labelText: string
}
```

Comportamiento:

* aparecen en puntos fijos;
* se mueven lentamente hacia el jugador;
* si alcanzan al jugador, causan daño;
* al recibir disparo, mueren;
* al morir, notifican al sistema de evaluación.

### 10.8 Condición de victoria

El jugador gana cuando:

* todos los enemigos incorrectos fueron eliminados;
* al menos un enemigo correcto sigue vivo.

### 10.9 Condición de derrota

El jugador pierde cuando:

* elimina al enemigo correcto en modo estricto;
* o su salud llega a 0;
* o el tiempo máximo termina, si se activa timer.

Para MVP, usar configuración:

```ts
strictCorrectKillGameOver = true
```

Más adelante se podrá cambiar a modo educativo menos punitivo:

```ts
strictCorrectKillGameOver = false
correctKillPenalty = "lose_life_and_show_feedback"
```

---

## 11. Diseño educativo

### 11.1 Pregunta

Cada juego comienza con una pregunta ligada a una lección.

Ejemplo:

```json
{
  "id": "geo-france-capital-001",
  "subject": "Geografía",
  "lessonId": "geo-france-basic",
  "prompt": "¿Cuál es la capital de Francia?",
  "type": "single_choice",
  "options": [
    {
      "id": "A",
      "enemyLabel": "A",
      "boardText": "A — Berlín",
      "fullText": "Berlín es la capital de Alemania."
    },
    {
      "id": "B",
      "enemyLabel": "B",
      "boardText": "B — París",
      "fullText": "París es la capital de Francia.",
      "isCorrect": true
    },
    {
      "id": "C",
      "enemyLabel": "C",
      "boardText": "C — Brasilia",
      "fullText": "Brasilia es la capital de Brasil."
    },
    {
      "id": "D",
      "enemyLabel": "D",
      "boardText": "D — Roma",
      "fullText": "Roma es la capital de Italia."
    }
  ],
  "explanation": "París es la capital de Francia.",
  "difficulty": 1
}
```

### 11.2 Reglas de contenido

Cada opción debe tener:

* `id`: código corto;
* `enemyLabel`: texto que aparece sobre enemigo;
* `boardText`: texto visible en panel/pared;
* `fullText`: explicación completa;
* `isCorrect`: booleano opcional.

### 11.3 Respuestas largas

Para respuestas extensas, nunca mostrar todo sobre el enemigo.

Usar esta estructura:

```json
{
  "id": "A",
  "enemyLabel": "A",
  "boardText": "A — El personaje actuó por miedo.",
  "fullText": "El personaje actuó por miedo porque el texto indica que cambió su decisión después de escuchar la amenaza."
}
```

Reglas:

* enemigo: solo A/B/C/D;
* pared principal: pregunta completa;
* panel de opciones: resumen claro;
* tooltip al apuntar: resumen corto;
* pantalla final: explicación completa.

---

## 12. UI dentro del mundo

### 12.1 AnswerBoard

Componente central del MVP.

Responsabilidad:

Mostrar pregunta y opciones dentro del mundo 3D, sobre una pared o panel.

Debe soportar:

* título de materia;
* pregunta;
* opciones A/B/C/D;
* ajuste de texto;
* alto contraste;
* estado de opción eliminada;
* resaltado de opción al apuntar;
* layout legible a distancia.

API propuesta:

```ts
class AnswerBoard {
  constructor(scene: BABYLON.Scene, options: AnswerBoardOptions)

  setQuestion(question: Question): void

  highlightOption(optionId: string | null): void

  markOptionEliminated(optionId: string): void

  showResult(correctOptionId: string, explanation: string): void

  dispose(): void
}
```

### 12.2 FloatingLabel

Componente para mostrar A/B/C/D sobre enemigos.

API propuesta:

```ts
class FloatingLabel {
  constructor(scene: BABYLON.Scene, target: BABYLON.AbstractMesh, text: string)

  setText(text: string): void

  setVisible(visible: boolean): void

  update(): void

  dispose(): void
}
```

### 12.3 AimTooltip

Cuando el jugador apunta a un enemigo, mostrar información breve.

Ejemplo:

```txt
B — París
```

API propuesta:

```ts
class AimTooltip {
  setTargetOption(option: AnswerOption | null): void
}
```

### 12.4 HUD mínimo

Mostrar:

* salud;
* objetivo actual;
* cantidad de incorrectas eliminadas;
* estado de juego;
* botón/texto de reinicio.

---

## 13. Arquitectura técnica

### 13.1 Estructura de carpetas

```txt
/src
  main.ts
  GameApp.ts

  /core
    Engine.ts
    SceneManager.ts
    InputManager.ts
    Time.ts
    Debug.ts

  /content
    lessons/
      geography.france.json

  /education
    types.ts
    QuestionLoader.ts
    QuestionEvaluator.ts

  /gameplay
    GameMode.ts
    FpsEliminationMode.ts
    PlayerController.ts
    WeaponController.ts
    Enemy.ts
    EnemySpawner.ts
    EnemyRegistry.ts

  /environment
    SubwayStationBuilder.ts
    MapBuilder.ts
    Materials.ts
    Lights.ts

  /ui
    Hud.ts
    StartScreen.ts
    EndScreen.ts

  /ui3d
    AnswerBoard.ts
    FloatingLabel.ts
    AimTooltip.ts

  /utils
    math.ts
    ids.ts
    dispose.ts

/tests
  QuestionEvaluator.test.ts
  FpsEliminationMode.test.ts
```

### 13.2 Dependencias iniciales

```json
{
  "dependencies": {
    "@babylonjs/core": "latest",
    "@babylonjs/gui": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest",
    "eslint": "latest",
    "prettier": "latest"
  }
}
```

### 13.3 Scripts esperados

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  }
}
```

---

## 14. Tipos de datos

### 14.1 Question

```ts
export type QuestionType = "single_choice";

export interface Question {
  id: string;
  subject: string;
  lessonId: string;
  prompt: string;
  type: QuestionType;
  options: AnswerOption[];
  explanation: string;
  difficulty: number;
}
```

### 14.2 AnswerOption

```ts
export interface AnswerOption {
  id: string;
  enemyLabel: string;
  boardText: string;
  fullText: string;
  isCorrect?: boolean;
}
```

### 14.3 GameResult

```ts
export interface GameResult {
  questionId: string;
  status: "won" | "lost";
  correctOptionId: string;
  eliminatedOptionIds: string[];
  wronglyEliminatedCorrectOption: boolean;
  elapsedMs: number;
  shotsFired: number;
  hits: number;
}
```

### 14.4 GameConfig

```ts
export interface GameConfig {
  strictCorrectKillGameOver: boolean;
  playerHealth: number;
  enemyDamage: number;
  enemySpeed: number;
  weaponCooldownMs: number;
  maxGameTimeMs?: number;
}
```

---

## 15. Sistemas principales

### 15.1 GameApp

Responsabilidades:

* inicializar Babylon engine;
* crear canvas;
* cargar contenido;
* crear escena;
* iniciar modo de juego;
* manejar resize;
* manejar dispose.

### 15.2 SceneManager

Responsabilidades:

* crear escena Babylon;
* configurar cámara;
* configurar luces;
* configurar render loop;
* conectar input.

### 15.3 SubwayStationBuilder

Responsabilidades:

* construir mapa procedural;
* crear piso, paredes, techo, columnas, túneles;
* colocar paneles educativos;
* retornar spawn points.

API propuesta:

```ts
interface SubwayStationBuildResult {
  playerSpawn: BABYLON.Vector3;
  enemySpawns: BABYLON.Vector3[];
  answerBoardAnchor: BABYLON.AbstractMesh;
}
```

### 15.4 QuestionLoader

Responsabilidades:

* cargar JSON local;
* validar estructura básica;
* retornar `Question`.

### 15.5 QuestionEvaluator

Responsabilidades:

* identificar respuesta correcta;
* determinar si una opción eliminada es correcta o incorrecta;
* determinar victoria/derrota;
* generar resumen de resultado.

API propuesta:

```ts
class QuestionEvaluator {
  constructor(question: Question)

  getCorrectOption(): AnswerOption

  isCorrectOption(optionId: string): boolean

  isIncorrectOption(optionId: string): boolean

  getIncorrectOptionIds(): string[]
}
```

### 15.6 FpsEliminationMode

Responsabilidades:

* orquestar el loop del juego;
* crear jugador;
* crear enemigos;
* conectar disparos con enemigos;
* recibir eventos de muerte de enemigos;
* evaluar condiciones de victoria/derrota;
* actualizar UI;
* finalizar partida.

Estados:

```ts
type GameState =
  | "intro"
  | "reading"
  | "playing"
  | "won"
  | "lost";
```

### 15.7 PlayerController

Responsabilidades:

* movimiento WASD;
* cámara FPS;
* pointer lock;
* colisiones básicas;
* salud.

### 15.8 WeaponController

Responsabilidades:

* detectar click;
* raycast desde cámara;
* aplicar hit a enemigo;
* cooldown;
* contar disparos;
* comunicar hits.

### 15.9 EnemySpawner

Responsabilidades:

* crear enemigos a partir de opciones;
* asignar `optionId`;
* crear label A/B/C/D;
* registrar enemigos vivos.

### 15.10 Enemy

Responsabilidades:

* mesh visual;
* movimiento hacia jugador;
* recibir daño;
* morir;
* emitir evento `onKilled`.

---

## 16. Lógica central del gameplay

Pseudocódigo:

```ts
load question

correctOption = evaluator.getCorrectOption()
incorrectOptionIds = evaluator.getIncorrectOptionIds()

build subway station
create AnswerBoard
answerBoard.setQuestion(question)

spawn player
spawn one enemy per option

state = "reading"

after readingDelay:
  state = "playing"

on enemy killed:
  optionId = enemy.optionId

  if evaluator.isCorrectOption(optionId):
    if config.strictCorrectKillGameOver:
      endGame("lost")
    else:
      applyPenalty()
      showFeedback("Esa era la respuesta correcta.")
    return

  mark option as eliminated
  answerBoard.markOptionEliminated(optionId)

  if all incorrect options eliminated and correct enemy alive:
    endGame("won")

on player health <= 0:
  endGame("lost")

on endGame:
  stop enemy movement
  disable shooting
  show result screen
  answerBoard.showResult(correctOption.id, question.explanation)
```

---

## 17. Requisitos funcionales

### RF-001 — Cargar pregunta desde JSON

El juego debe cargar una pregunta desde un archivo JSON local.

Criterios de aceptación:

* el JSON contiene pregunta, opciones y explicación;
* el juego falla de forma controlada si falta una respuesta correcta;
* el contenido se puede cambiar sin modificar lógica del juego.

### RF-002 — Crear escena 3D en navegador

El juego debe renderizar una escena 3D con Babylon.js.

Criterios de aceptación:

* se ve piso, paredes, techo, columnas y luces;
* el jugador puede mirar alrededor;
* la escena se adapta al tamaño de la ventana.

### RF-003 — Mostrar pregunta en pared

La pregunta debe aparecer dentro del mundo 3D.

Criterios de aceptación:

* texto legible desde la zona de inicio;
* alto contraste;
* no depende solo del HUD.

### RF-004 — Mostrar opciones en panel/pared

Las opciones completas deben permanecer visibles durante la partida.

Criterios de aceptación:

* opciones A/B/C/D visibles;
* texto con wrapping;
* panel colocado en ubicación estratégica;
* panel no desaparece durante combate.

### RF-005 — Crear enemigos por opción

El juego debe crear un enemigo por cada opción.

Criterios de aceptación:

* cada enemigo tiene `optionId`;
* cada enemigo tiene label visible;
* el label coincide con A/B/C/D.

### RF-006 — Disparo por raycast

El jugador debe poder disparar a enemigos.

Criterios de aceptación:

* click izquierdo dispara;
* raycast detecta enemigo apuntado;
* enemigo muere al recibir hit;
* contador de disparos se actualiza.

### RF-007 — Evaluar opción eliminada

El sistema debe saber si el enemigo eliminado corresponde a opción correcta o incorrecta.

Criterios de aceptación:

* eliminar incorrecta marca progreso;
* eliminar correcta dispara derrota en modo estricto;
* el resultado se registra correctamente.

### RF-008 — Victoria

El jugador gana al eliminar todas las opciones incorrectas y mantener viva la correcta.

Criterios de aceptación:

* pantalla de victoria aparece;
* se muestra respuesta correcta;
* se muestra explicación.

### RF-009 — Derrota

El jugador pierde si elimina la respuesta correcta o su salud llega a 0.

Criterios de aceptación:

* pantalla de derrota aparece;
* se muestra la respuesta correcta;
* se muestra explicación educativa.

### RF-010 — Reinicio

El jugador puede reiniciar la partida.

Criterios de aceptación:

* tecla `R` reinicia;
* botón “Play Again” reinicia;
* estado interno se limpia correctamente.

---

## 18. Requisitos no funcionales

### RNF-001 — Performance

Objetivo inicial:

* 60 FPS en desktop moderno;
* mínimo aceptable: 30 FPS;
* menos de 50 meshes dinámicos en MVP;
* geometría simple;
* sin post-processing pesado en MVP.

### RNF-002 — Calidad de código

* TypeScript estricto;
* módulos pequeños;
* nombres claros;
* evitar lógica duplicada;
* pruebas unitarias para evaluación educativa;
* build sin errores.

### RNF-003 — Accesibilidad básica

* texto de alto contraste;
* labels grandes;
* opción de bajar velocidad de enemigos;
* opción de modo no estricto en futuras versiones;
* evitar flashes intensos;
* no depender exclusivamente de color para distinguir opciones.

### RNF-004 — Seguridad y contenido

* evitar gore;
* enemigos abstractos o estilizados;
* violencia no realista;
* lenguaje apropiado para estudiantes;
* no usar armas realistas como foco visual del producto;
* considerar skins alternativas: virus, bugs, drones, bloques corruptos.

### RNF-005 — Extensibilidad

El MVP debe permitir agregar:

* nuevas preguntas;
* nuevos mapas;
* nuevos modos;
* nuevos tipos de pregunta;
* nuevos comportamientos de enemigo;
* backend futuro.

---

## 19. Métricas del MVP

Métricas internas a registrar localmente:

* resultado: victoria/derrota;
* tiempo total;
* disparos realizados;
* hits;
* precisión;
* opción correcta;
* opciones eliminadas;
* si eliminó la correcta;
* salud final.

No se requiere persistencia en backend para MVP. Puede mostrarse en pantalla final y guardarse temporalmente en memoria.

---

## 20. Plan de implementación para agentes

## Fase 0 — Setup del proyecto

### Objetivo

Crear la base del proyecto con Babylon.js, TypeScript y Vite.

### Tareas

1. Crear proyecto Vite TypeScript.
2. Instalar Babylon.js.
3. Configurar ESLint, Prettier y Vitest.
4. Crear estructura de carpetas.
5. Crear canvas fullscreen.
6. Crear render loop básico.
7. Crear escena vacía con cámara y luz.

### Entregables

* proyecto corre con `npm run dev`;
* build funciona con `npm run build`;
* canvas renderiza una escena básica.

### Definition of Done

* no errores TypeScript;
* no errores build;
* escena visible en navegador.

---

## Fase 1 — Tipos educativos y carga de contenido

### Objetivo

Implementar modelo de pregunta y loader JSON.

### Tareas

1. Crear `education/types.ts`.
2. Crear `content/lessons/geography.france.json`.
3. Crear `QuestionLoader.ts`.
4. Crear `QuestionEvaluator.ts`.
5. Crear tests para `QuestionEvaluator`.

### Entregables

* pregunta cargada desde JSON;
* correct option detectada;
* incorrect options detectadas;
* tests pasando.

### Definition of Done

* `npm run test` pasa;
* cambiar JSON cambia el contenido del juego sin tocar lógica.

---

## Fase 2 — Construcción del mapa

### Objetivo

Crear estación de metro subterránea con primitives.

### Tareas

1. Crear `SubwayStationBuilder.ts`.
2. Crear piso, paredes, techo y columnas.
3. Crear andén y vías.
4. Crear zona segura inicial.
5. Crear arena de combate.
6. Crear anchors para AnswerBoard.
7. Crear spawn points de enemigos.
8. Crear materiales básicos.

### Entregables

* mapa navegable;
* spawn del jugador;
* 4 spawn points de enemigos;
* panel location para pregunta/opciones.

### Definition of Done

* escena tiene identidad visual clara de estación de metro;
* no usa assets externos;
* geometría limpia y simple.

---

## Fase 3 — AnswerBoard 3D

### Objetivo

Mostrar pregunta y opciones dentro del mundo.

### Tareas

1. Crear `AnswerBoard.ts`.
2. Crear mesh/panel para pregunta.
3. Crear panel para opciones.
4. Renderizar texto con Babylon GUI o DynamicTexture.
5. Implementar wrapping de texto.
6. Implementar alto contraste.
7. Implementar `markOptionEliminated`.
8. Implementar `highlightOption`.

### Entregables

* pregunta visible en pared;
* opciones visibles en pared;
* opciones marcadas al ser eliminadas;
* texto legible desde distancia razonable.

### Definition of Done

* el jugador puede leer la pregunta sin abrir HUD;
* opciones permanecen visibles durante combate;
* layout funciona para textos cortos y medianos.

---

## Fase 4 — Controlador FPS

### Objetivo

Permitir movimiento y cámara FPS.

### Tareas

1. Crear `PlayerController.ts`.
2. Implementar pointer lock.
3. Implementar mouse look.
4. Implementar movimiento WASD.
5. Implementar gravedad simple o mantener jugador sobre plano.
6. Implementar salud del jugador.
7. Crear HUD básico de salud.

### Entregables

* jugador se mueve;
* cámara responde al mouse;
* salud visible;
* `Esc` libera mouse.

### Definition of Done

* controles se sienten aceptables;
* no hay movimiento fuera del mapa en condiciones normales.

---

## Fase 5 — Arma y raycast

### Objetivo

Permitir disparar a enemigos.

### Tareas

1. Crear `WeaponController.ts`.
2. Implementar click izquierdo.
3. Implementar cooldown.
4. Implementar raycast desde cámara.
5. Detectar mesh de enemigo.
6. Emitir evento `onEnemyHit`.
7. Crear feedback visual simple de disparo.

### Entregables

* disparo detecta enemigos;
* cooldown evita spam extremo;
* contador de disparos funciona.

### Definition of Done

* se puede eliminar enemigo apuntando y haciendo click;
* raycast no elimina objetos no-enemigos.

---

## Fase 6 — Enemigos

### Objetivo

Crear enemigos por opción educativa.

### Tareas

1. Crear `Enemy.ts`.
2. Crear `EnemySpawner.ts`.
3. Crear mesh box para enemigo.
4. Asignar `optionId`.
5. Crear label flotante A/B/C/D.
6. Hacer que se mueva hacia jugador.
7. Implementar daño al jugador por proximidad.
8. Implementar muerte.

### Entregables

* 4 enemigos creados;
* cada uno tiene label correcto;
* enemigos persiguen al jugador;
* enemigos pueden morir;
* enemigos dañan al jugador.

### Definition of Done

* cada enemigo está asociado a una opción;
* al morir, comunica `optionId` correctamente.

---

## Fase 7 — Modo de juego FPS Elimination

### Objetivo

Unir contenido educativo, mapa, jugador, enemigos y evaluación.

### Tareas

1. Crear `FpsEliminationMode.ts`.
2. Implementar estados:

   * intro;
   * reading;
   * playing;
   * won;
   * lost.
3. Conectar `QuestionEvaluator`.
4. Conectar `EnemySpawner`.
5. Conectar `WeaponController`.
6. Implementar condición de victoria.
7. Implementar condición de derrota.
8. Implementar final screen.

### Entregables

* juego completo de inicio a fin;
* victoria funciona;
* derrota funciona;
* feedback educativo aparece.

### Definition of Done

* destruir A, C y D produce victoria si B queda vivo;
* destruir B produce derrota;
* si salud llega a 0, derrota;
* pantalla final muestra explicación.

---

## Fase 8 — Polish visual y UX

### Objetivo

Mejorar claridad, legibilidad y sensación de calidad.

### Tareas

1. Mejorar iluminación.
2. Agregar paneles repetidos de opciones en el mapa.
3. Agregar crosshair.
4. Agregar tooltip al apuntar enemigo.
5. Agregar feedback al eliminar incorrecta.
6. Agregar feedback al apuntar correcta.
7. Agregar sonidos simples opcionales.
8. Agregar pantalla de inicio.
9. Agregar pantalla final mejorada.
10. Ajustar tamaños de texto.

### Entregables

* experiencia entendible sin explicación externa;
* mejor claridad visual;
* juego más pulido.

### Definition of Done

* un usuario puede jugar sin instrucciones verbales;
* el objetivo queda claro en menos de 10 segundos.

---

## Fase 9 — QA y validación

### Objetivo

Asegurar estabilidad y experiencia mínima de producción.

### Tareas

1. Probar en Chrome.
2. Probar en Edge.
3. Probar en Firefox.
4. Probar resize de ventana.
5. Probar reinicio.
6. Probar victoria.
7. Probar derrota por matar correcta.
8. Probar derrota por salud.
9. Probar textos largos.
10. Revisar performance.

### Entregables

* checklist QA completado;
* bugs críticos corregidos;
* build de producción generado.

### Definition of Done

* `npm run build` pasa;
* no errores críticos en consola;
* flujo completo funciona.

---

## 21. Instrucciones específicas para agentes de IA

### 21.1 Reglas generales

Los agentes deben seguir estas reglas:

1. Usar TypeScript estricto.
2. No introducir frameworks innecesarios.
3. No usar assets externos en MVP.
4. No implementar backend todavía.
5. No mezclar lógica educativa con lógica visual.
6. No hardcodear la pregunta dentro del gameplay.
7. No poner texto largo sobre enemigos.
8. No crear una arquitectura ECS compleja todavía.
9. Priorizar claridad sobre sofisticación.
10. Cada módulo debe tener responsabilidad clara.

### 21.2 Orden recomendado de trabajo

Los agentes deben implementar en este orden:

1. setup;
2. tipos educativos;
3. evaluator;
4. mapa;
5. AnswerBoard;
6. jugador;
7. arma;
8. enemigos;
9. modo de juego;
10. polish;
11. QA.

### 21.3 Contrato para contenido

Todo nuevo contenido debe seguir este contrato:

```json
{
  "id": "unique-question-id",
  "subject": "Subject name",
  "lessonId": "lesson-id",
  "prompt": "Question prompt",
  "type": "single_choice",
  "options": [
    {
      "id": "A",
      "enemyLabel": "A",
      "boardText": "A — Short visible answer",
      "fullText": "Longer explanation or complete answer."
    }
  ],
  "explanation": "Explanation shown after the game.",
  "difficulty": 1
}
```

### 21.4 Contrato para modos de juego

Todo modo de juego futuro debe implementar:

```ts
export interface GameMode {
  start(): void;
  update(deltaSeconds: number): void;
  end(): void;
  dispose(): void;
}
```

### 21.5 Contrato para enemigos

Todo enemigo debe exponer:

```ts
export interface EnemyInstance {
  id: string;
  optionId: string;
  mesh: BABYLON.AbstractMesh;
  isAlive: boolean;
  kill(): void;
  dispose(): void;
}
```

### 21.6 Contrato para evaluación

La evaluación no debe depender de Babylon.js.

Correcto:

```ts
evaluator.isCorrectOption("B")
```

Incorrecto:

```ts
enemy.mesh.metadata.isCorrect
```

El sistema educativo debe ser testeable sin render 3D.

---

## 22. Primer contenido educativo

Archivo:

```txt
/src/content/lessons/geography.france.json
```

Contenido:

```json
{
  "id": "geo-france-capital-001",
  "subject": "Geografía",
  "lessonId": "geo-france-basic",
  "prompt": "¿Cuál es la capital de Francia?",
  "type": "single_choice",
  "options": [
    {
      "id": "A",
      "enemyLabel": "A",
      "boardText": "A — Berlín",
      "fullText": "Berlín es la capital de Alemania."
    },
    {
      "id": "B",
      "enemyLabel": "B",
      "boardText": "B — París",
      "fullText": "París es la capital de Francia.",
      "isCorrect": true
    },
    {
      "id": "C",
      "enemyLabel": "C",
      "boardText": "C — Brasilia",
      "fullText": "Brasilia es la capital de Brasil."
    },
    {
      "id": "D",
      "enemyLabel": "D — Roma",
      "boardText": "D — Roma",
      "fullText": "Roma es la capital de Italia."
    }
  ],
  "explanation": "París es la capital de Francia.",
  "difficulty": 1
}
```

Nota: corregir `enemyLabel` de D a `"D"` en implementación final. El label del enemigo nunca debe incluir texto largo.

---

## 23. Checklist de aceptación final del MVP

El MVP se considera completo cuando:

* el juego corre en navegador;
* se usa Babylon.js + TypeScript;
* se carga pregunta desde JSON;
* existe estación de metro simple;
* la pregunta aparece en pared;
* las opciones aparecen en panel visible;
* enemigos muestran A/B/C/D;
* jugador puede moverse en FPS;
* jugador puede disparar;
* enemigos incorrectos pueden ser eliminados;
* eliminar correcta causa derrota;
* eliminar todas las incorrectas causa victoria;
* feedback educativo aparece al final;
* se puede reiniciar;
* build de producción funciona;
* no hay errores críticos en consola;
* el código está organizado para que agentes agreguen nuevas preguntas y modos.

---

## 24. Roadmap posterior al MVP

### Versión 0.2

* múltiples preguntas en una sesión;
* selección de materia;
* varios mapas;
* modo no estricto;
* mejor sistema de feedback;
* dificultad ajustable.

### Versión 0.3

* nuevos tipos de pregunta:

  * matching;
  * ordenar eventos;
  * ordenar pasos;
  * selección múltiple;
  * verdadero/falso.

### Versión 0.4

* backend;
* cuentas;
* progreso del estudiante;
* dashboard docente;
* creación de lecciones.

### Versión 0.5

* generación asistida de preguntas;
* generación asistida de mapas;
* analíticas de aprendizaje;
* recomendaciones por dificultad.

---

## 25. Riesgos principales

### Riesgo 1 — Texto largo ilegible

Mitigación:

* usar códigos A/B/C/D en enemigos;
* usar paneles grandes;
* usar wrapping;
* repetir paneles en varias zonas;
* mostrar tooltip al apuntar.

### Riesgo 2 — Gameplay distrae del aprendizaje

Mitigación:

* zona segura inicial;
* enemigos lentos;
* mapas simples;
* feedback educativo obligatorio;
* dificultad progresiva.

### Riesgo 3 — El juego se siente injusto

Mitigación:

* hitboxes generosos;
* labels claros;
* modo no estricto futuro;
* feedback inmediato;
* opción de reducir velocidad.

### Riesgo 4 — Arquitectura se vuelve difícil para agentes

Mitigación:

* TypeScript code-first;
* módulos pequeños;
* contratos claros;
* JSON para contenido;
* tests para evaluación;
* evitar editor visual obligatorio.

### Riesgo 5 — Calidad visual baja por no usar assets

Mitigación:

* buen diseño de iluminación;
* composición modular;
* materiales simples pero consistentes;
* paneles limpios;
* efectos visuales mínimos;
* mapa con identidad clara.

---

## 26. Conclusión

El MVP debe probar una sola hipótesis:

**Una pregunta educativa puede convertirse en una experiencia FPS 3D jugable, legible y evaluable dentro del navegador.**

La versión inicial debe evitar complejidad innecesaria. No necesita backend, assets externos ni múltiples materias. Lo importante es construir una base sólida:

* Babylon.js + TypeScript;
* contenido JSON;
* mapa procedural simple;
* AnswerBoard 3D;
* enemigos A/B/C/D;
* evaluación educativa separada;
* gameplay completo con victoria, derrota y feedback.

Una vez probado este primer juego, la plataforma puede crecer hacia más materias, más modos y generación automática de actividades.
