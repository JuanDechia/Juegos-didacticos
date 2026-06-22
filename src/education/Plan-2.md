# PRD Addendum v0.2 — Round-Based Educational Zombie Survival

## 1. Resumen de la actualización

El juego ya es funcional en su versión inicial. La siguiente etapa convierte el MVP en un sistema de rounds progresivos con preguntas de capitales de países, economía interna, armas comprables en paredes, zombies con cuerpo articulado hecho con boxes, recarga de armas, inventario de munición y expansión del mapa con habitaciones conectadas.

La nueva experiencia será similar a un survival arcade por oleadas, pero con una regla educativa central:

**Cada round está asociado a una pregunta fija sobre capitales de países.**

El jugador empieza siempre desde la primera pregunta fácil. Si gana, avanza al siguiente round con una pregunta más difícil. Si pierde, debe reiniciar desde el comienzo. El objetivo es conseguir un nuevo récord jugando la mayor cantidad de rounds sin perder.

---

# 2. Nueva dirección del juego

## 2.1 Concepto

El juego se convierte en una experiencia de supervivencia educativa en navegador.

Cada partida comienza en Round 1. La pregunta del Round 1 siempre es la misma. El orden de las preguntas es determinístico, no aleatorio.

Ejemplo:

```txt id="98yt6c"
Round 1:
País: Francia
Pregunta: ¿Cuál es la capital de Francia?
Respuesta correcta: París

Round 2:
País: Brasil
Pregunta: ¿Cuál es la capital de Brasil?
Respuesta correcta: Brasilia

Round 3:
País: Japón
Pregunta: ¿Cuál es la capital de Japón?
Respuesta correcta: Tokio
```

El jugador debe sobrevivir, eliminar zombies con respuestas incorrectas y proteger la respuesta correcta. Al completar el round, pasa al siguiente. Si falla, el run termina.

---

# 3. Objetivos de v0.2

## Objetivos principales

1. Implementar sistema de rounds determinístico.
2. Popular JSON con preguntas de capitales de muchos países.
3. Reiniciar desde Round 1 cuando el jugador pierde.
4. Guardar récord local del jugador.
5. Agregar dinero inicial y recompensas por eliminar zombies.
6. Agregar armas comprables desde la pared.
7. Agregar munición, cargador y recarga.
8. Agregar zombies humanoides hechos solo con boxes.
9. Agregar animación simple de caminata.
10. Expandir el mapa con dos habitaciones conectadas.
11. Mantener las respuestas visibles en la pared de la habitación principal.

---

# 4. Reglas principales de progresión

## 4.1 Orden determinístico de preguntas

El juego no debe seleccionar preguntas al azar para el modo principal.

El run debe usar una lista fija:

```txt id="n9oefh"
Round 1 -> Question 1
Round 2 -> Question 2
Round 3 -> Question 3
...
```

Esto permite que el jugador mejore por práctica y memoria, igual que en juegos arcade clásicos.

## 4.2 Dificultad incremental

Las preguntas deben estar ordenadas por dificultad.

Ejemplo de progresión:

```txt id="32ki6c"
Tier 1 — Muy fácil:
Francia, Brasil, Japón, Estados Unidos, Argentina

Tier 2 — Fácil:
Canadá, México, Alemania, Italia, España

Tier 3 — Media:
Egipto, India, Australia, Turquía, Corea del Sur

Tier 4 — Difícil:
Kazajistán, Marruecos, Vietnam, Indonesia, Nigeria

Tier 5 — Muy difícil:
Kirguistán, Burkina Faso, Eslovenia, Eritrea, Bután
```

## 4.3 Derrota

Si el jugador pierde, el run termina.

Al perder:

* se muestra el round alcanzado;
* se muestra el récord actual;
* se muestra la respuesta correcta;
* se ofrece botón `Restart Run`;
* al reiniciar, vuelve a Round 1.

## 4.4 Victoria de round

Si el jugador gana el round:

* se muestra feedback breve;
* se otorga recompensa;
* se avanza al siguiente round;
* el dinero, armas y munición pueden persistir durante el run.

## 4.5 Récord

Guardar en `localStorage`:

```ts id="t3e25f"
interface PlayerRecord {
  bestRound: number;
  bestScore: number;
  bestMoney: number;
  bestTimestamp: string;
}
```

El récord principal será:

```txt id="x0h8uf"
Highest Round Reached
```

---

# 5. Sistema de preguntas de capitales

## 5.1 Nuevo tipo de contenido

Crear archivo:

```txt id="76sqch"
/src/content/questionSets/capitals.rounds.json
```

Estructura:

```json id="f9x5ad"
{
  "id": "capitals-main-run-v1",
  "title": "Capitales del Mundo",
  "mode": "deterministic_rounds",
  "rounds": [
    {
      "round": 1,
      "difficultyTier": 1,
      "country": "Francia",
      "capital": "París",
      "prompt": "¿Cuál es la capital de Francia?",
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
      "explanation": "París es la capital de Francia."
    }
  ]
}
```

## 5.2 Reglas del dataset

Cada round debe tener:

* `round`;
* `difficultyTier`;
* `country`;
* `capital`;
* `prompt`;
* 4 opciones;
* 1 opción correcta;
* 3 distractores;
* explicación.

## 5.3 Distractores

Los distractores deben ser capitales reales, no palabras inventadas.

Correcto:

```txt id="xqmcvc"
París, Berlín, Roma, Brasilia
```

Incorrecto:

```txt id="x9gnyg"
París, Banana City, FakeLand, ZombieTown
```

## 5.4 Orden inicial recomendado de rounds

Seed inicial de 40 rounds:

```json id="eef847"
[
  { "round": 1, "tier": 1, "country": "Francia", "capital": "París" },
  { "round": 2, "tier": 1, "country": "Brasil", "capital": "Brasilia" },
  { "round": 3, "tier": 1, "country": "Japón", "capital": "Tokio" },
  { "round": 4, "tier": 1, "country": "Estados Unidos", "capital": "Washington D. C." },
  { "round": 5, "tier": 1, "country": "Argentina", "capital": "Buenos Aires" },

  { "round": 6, "tier": 2, "country": "Canadá", "capital": "Ottawa" },
  { "round": 7, "tier": 2, "country": "México", "capital": "Ciudad de México" },
  { "round": 8, "tier": 2, "country": "Alemania", "capital": "Berlín" },
  { "round": 9, "tier": 2, "country": "Italia", "capital": "Roma" },
  { "round": 10, "tier": 2, "country": "España", "capital": "Madrid" },

  { "round": 11, "tier": 3, "country": "Reino Unido", "capital": "Londres" },
  { "round": 12, "tier": 3, "country": "China", "capital": "Pekín" },
  { "round": 13, "tier": 3, "country": "India", "capital": "Nueva Delhi" },
  { "round": 14, "tier": 3, "country": "Australia", "capital": "Canberra" },
  { "round": 15, "tier": 3, "country": "Egipto", "capital": "El Cairo" },

  { "round": 16, "tier": 4, "country": "Corea del Sur", "capital": "Seúl" },
  { "round": 17, "tier": 4, "country": "Turquía", "capital": "Ankara" },
  { "round": 18, "tier": 4, "country": "Sudáfrica", "capital": "Pretoria" },
  { "round": 19, "tier": 4, "country": "Nigeria", "capital": "Abuya" },
  { "round": 20, "tier": 4, "country": "Vietnam", "capital": "Hanói" },

  { "round": 21, "tier": 5, "country": "Indonesia", "capital": "Yakarta" },
  { "round": 22, "tier": 5, "country": "Tailandia", "capital": "Bangkok" },
  { "round": 23, "tier": 5, "country": "Marruecos", "capital": "Rabat" },
  { "round": 24, "tier": 5, "country": "Kazajistán", "capital": "Astaná" },
  { "round": 25, "tier": 5, "country": "Nueva Zelanda", "capital": "Wellington" },

  { "round": 26, "tier": 6, "country": "Perú", "capital": "Lima" },
  { "round": 27, "tier": 6, "country": "Chile", "capital": "Santiago" },
  { "round": 28, "tier": 6, "country": "Colombia", "capital": "Bogotá" },
  { "round": 29, "tier": 6, "country": "Uruguay", "capital": "Montevideo" },
  { "round": 30, "tier": 6, "country": "Paraguay", "capital": "Asunción" },

  { "round": 31, "tier": 7, "country": "Eslovenia", "capital": "Liubliana" },
  { "round": 32, "tier": 7, "country": "Eslovaquia", "capital": "Bratislava" },
  { "round": 33, "tier": 7, "country": "Croacia", "capital": "Zagreb" },
  { "round": 34, "tier": 7, "country": "Serbia", "capital": "Belgrado" },
  { "round": 35, "tier": 7, "country": "Estonia", "capital": "Tallin" },

  { "round": 36, "tier": 8, "country": "Letonia", "capital": "Riga" },
  { "round": 37, "tier": 8, "country": "Lituania", "capital": "Vilna" },
  { "round": 38, "tier": 8, "country": "Georgia", "capital": "Tiflis" },
  { "round": 39, "tier": 8, "country": "Armenia", "capital": "Ereván" },
  { "round": 40, "tier": 8, "country": "Azerbaiyán", "capital": "Bakú" }
]
```

Nota para agentes: este seed debe convertirse a preguntas completas con opciones A/B/C/D.

---

# 6. Sistema de rounds

## 6.1 Nuevo módulo

Crear:

```txt id="1l00xi"
/src/rounds/RoundManager.ts
```

Responsabilidades:

* cargar lista de rounds;
* devolver round actual;
* avanzar al siguiente round;
* resetear run;
* guardar récord;
* exponer dificultad actual;
* comunicar eventos al GameMode.

## 6.2 Tipos

```ts id="i2ypck"
export interface RoundQuestion {
  round: number;
  difficultyTier: number;
  country: string;
  capital: string;
  prompt: string;
  options: AnswerOption[];
  explanation: string;
}

export interface RunState {
  currentRoundIndex: number;
  money: number;
  score: number;
  status: "not_started" | "playing" | "won_round" | "lost_run";
}
```

## 6.3 API propuesta

```ts id="qbu3ng"
class RoundManager {
  constructor(rounds: RoundQuestion[])

  startNewRun(): void

  getCurrentRound(): RoundQuestion

  completeCurrentRound(): void

  advanceToNextRound(): void

  loseRun(): void

  getCurrentRoundNumber(): number

  getBestRecord(): PlayerRecord

  saveRecordIfNeeded(result: RunResult): void
}
```

---

# 7. Economía del jugador

## 7.1 Dinero inicial

El jugador comienza cada run con:

```txt id="k9vv9p"
$100
```

## 7.2 Recompensas por zombie eliminado

Regla base:

```txt id="4q0jio"
Standard kill: +$10
One-shot headshot kill: +$30
```

## 7.3 Definición exacta

### Standard kill

El jugador recibe `$10` cuando elimina un zombie de forma normal.

Ejemplos:

* 3 tiros al cuerpo con pistola;
* varios tiros con sub-machine gun;
* varios tiros con machine gun;
* shotgun sin one-shot headshot.

### One-shot headshot

El jugador recibe `$30` si:

* el zombie tenía salud completa;
* el disparo impacta la cabeza;
* el zombie muere con ese único disparo.

## 7.4 Tipos

```ts id="bkz45v"
export type KillRewardType = "standard" | "one_shot_headshot";

export interface MoneyEvent {
  amount: number;
  reason: KillRewardType | "round_bonus" | "purchase";
  timestamp: number;
}
```

## 7.5 Módulo

Crear:

```txt id="mp6m32"
/src/economy/MoneyManager.ts
```

API:

```ts id="c541kp"
class MoneyManager {
  constructor(initialMoney: number)

  getMoney(): number

  canAfford(amount: number): boolean

  addMoney(amount: number, reason: string): void

  spendMoney(amount: number, reason: string): boolean

  reset(): void
}
```

---

# 8. Zombies humanoides hechos con boxes

## 8.1 Reemplazo de zombie-box simple

Los zombies ya no deben ser una sola caja.

Cada zombie debe estar compuesto por boxes:

* cabeza;
* torso;
* brazo izquierdo;
* brazo derecho;
* pierna izquierda;
* pierna derecha.

Opcional:

* cuello;
* manos;
* pies.

## 8.2 Jerarquía propuesta

```txt id="z2ncge"
ZombieRoot
  Torso
    Head
    LeftArm
    RightArm
    LeftLeg
    RightLeg
    FloatingLabel
```

## 8.3 Proporciones

```ts id="3gq7jr"
const zombieBodyConfig = {
  torso: { width: 0.7, height: 1.0, depth: 0.35 },
  head: { width: 0.45, height: 0.45, depth: 0.45 },
  arm: { width: 0.2, height: 0.8, depth: 0.2 },
  leg: { width: 0.25, height: 0.8, depth: 0.25 }
}
```

## 8.4 Hit zones

Cada parte del cuerpo debe tener metadata:

```ts id="w7kd9u"
mesh.metadata = {
  type: "zombie_hitbox",
  zombieId: zombie.id,
  hitZone: "head" | "torso" | "arm" | "leg"
}
```

## 8.5 Damage multiplier

```ts id="gvgf18"
const hitZoneMultipliers = {
  head: 3.0,
  torso: 1.0,
  arm: 0.75,
  leg: 0.75
}
```

---

# 9. Animación de caminata

## 9.1 Objetivo

Los zombies deben tener una animación simple de caminar.

No usar skeletons ni assets externos. La animación debe ser procedural con rotaciones de boxes.

## 9.2 Regla visual

Mientras el zombie camina:

* brazo izquierdo rota hacia adelante cuando pierna derecha va adelante;
* brazo derecho rota hacia adelante cuando pierna izquierda va adelante;
* piernas oscilan alternadamente;
* torso puede tener un pequeño balanceo;
* cabeza puede tener un leve bobbing.

## 9.3 Implementación propuesta

En `Zombie.update(deltaSeconds)`:

```ts id="egfkmx"
const walkTime = performance.now() * 0.006 * speedFactor;
const swing = Math.sin(walkTime) * 0.45;

leftArm.rotation.x = swing;
rightArm.rotation.x = -swing;

leftLeg.rotation.x = -swing;
rightLeg.rotation.x = swing;

torso.rotation.z = Math.sin(walkTime * 0.5) * 0.04;
head.position.y = baseHeadY + Math.sin(walkTime * 2) * 0.025;
```

## 9.4 Criterios de aceptación

* zombies parecen caminar;
* animación no requiere assets;
* animación se detiene al morir;
* no rompe hit detection.

---

# 10. Sistema de armas

## 10.1 Arma inicial

El jugador comienza con una pistola básica gratuita.

```txt id="zh5hgr"
Starting weapon: pistol
```

## 10.2 Armas comprables

Armas disponibles en v0.2:

1. Shotgun
2. Sub-machine gun
3. Machine gun

## 10.3 Estadísticas iniciales recomendadas

Usar RPM en vez de BPS para evitar confusión. RPM significa `rounds per minute`.

```ts id="smn49o"
export const weaponConfigs = {
  pistol: {
    displayName: "Pistol",
    price: 0,
    damage: 34,
    headMultiplier: 3.0,
    rpm: 240,
    magazineSize: 12,
    reserveAmmo: 48,
    reloadMs: 1200,
    isAutomatic: false
  },

  shotgun: {
    displayName: "Shotgun",
    price: 150,
    damage: 18,
    pellets: 6,
    headMultiplier: 2.0,
    rpm: 70,
    magazineSize: 6,
    reserveAmmo: 24,
    reloadMs: 2200,
    isAutomatic: false
  },

  subMachineGun: {
    displayName: "Sub-Machine Gun",
    price: 250,
    damage: 18,
    headMultiplier: 2.5,
    rpm: 650,
    magazineSize: 30,
    reserveAmmo: 120,
    reloadMs: 1700,
    isAutomatic: true
  },

  machineGun: {
    displayName: "Machine Gun",
    price: 500,
    damage: 26,
    headMultiplier: 2.2,
    rpm: 550,
    magazineSize: 60,
    reserveAmmo: 180,
    reloadMs: 2800,
    isAutomatic: true
  }
}
```

## 10.4 Balance inicial

Zombie base:

```ts id="2vf0wb"
zombieHealth = 100
```

Resultado esperado:

* pistola mata con 3 tiros al torso;
* pistola puede matar con 1 tiro a la cabeza;
* shotgun es fuerte a corta distancia;
* SMG dispara rápido pero gasta munición;
* machine gun es cara, fuerte y pesada;
* headshots son más rentables.

## 10.5 Fire cooldown

Calcular delay entre disparos:

```ts id="qz6in4"
fireDelayMs = 60000 / rpm
```

Ejemplo:

```txt id="61hbmk"
Pistol RPM 240 -> 250ms entre disparos
SMG RPM 650 -> 92ms entre disparos
```

---

# 11. Munición y recarga

## 11.1 Cada arma debe tener

```ts id="kdwztm"
interface WeaponState {
  weaponId: string;
  ammoInMagazine: number;
  reserveAmmo: number;
  isReloading: boolean;
  lastShotAtMs: number;
}
```

## 11.2 Reglas

* cada disparo consume 1 bala del cargador;
* shotgun consume 1 shell por disparo;
* si el cargador está vacío, no puede disparar;
* tecla `R` recarga;
* recarga tiene delay según arma;
* durante recarga no se puede disparar;
* si no hay munición de reserva, no se puede recargar.

## 11.3 Recarga

Pseudocódigo:

```ts id="l1ar2t"
reload() {
  if (isReloading) return
  if (ammoInMagazine === magazineSize) return
  if (reserveAmmo <= 0) return

  isReloading = true

  wait reloadMs

  needed = magazineSize - ammoInMagazine
  ammoToLoad = Math.min(needed, reserveAmmo)

  ammoInMagazine += ammoToLoad
  reserveAmmo -= ammoToLoad
  isReloading = false
}
```

## 11.4 HUD de munición

Mostrar:

```txt id="bdlgqk"
Weapon: Pistol
Ammo: 7 / 48
Money: $130
Round: 3
Record: 8
```

---

# 12. Compra de armas en paredes

## 12.1 Concepto

Agregar figuras crudas de armas en paredes, como decals o siluetas simples. El jugador puede acercarse y comprar el arma.

No se requieren modelos 3D de armas.

## 12.2 Implementación visual

Cada arma debe representarse con:

* panel rectangular en la pared;
* silueta simple dibujada con líneas o boxes;
* nombre del arma;
* precio;
* prompt de interacción.

Ejemplo:

```txt id="k31i3e"
[ SHOTGUN ]
Price: $150
Press E to buy
```

## 12.3 Módulo

Crear:

```txt id="vy9g63"
/src/weapons/WallWeaponPurchase.ts
```

## 12.4 API

```ts id="wb1naf"
interface WallWeaponPurchaseConfig {
  weaponId: string;
  price: number;
  position: BABYLON.Vector3;
  rotation: BABYLON.Vector3;
  interactionRadius: number;
}
```

```ts id="fibjpd"
class WallWeaponPurchase {
  constructor(scene: BABYLON.Scene, config: WallWeaponPurchaseConfig)

  update(playerPosition: BABYLON.Vector3): void

  canInteract(playerPosition: BABYLON.Vector3): boolean

  tryPurchase(player: PlayerInventory, money: MoneyManager): PurchaseResult
}
```

## 12.5 Compra

Reglas:

* jugador se acerca al panel;
* aparece prompt;
* presiona `E`;
* si tiene dinero suficiente, compra arma;
* dinero disminuye;
* arma se agrega al inventario;
* si ya tiene el arma, se puede comprar munición en el futuro;
* en v0.2, si ya tiene el arma, mostrar `Already owned`.

## 12.6 Ubicación recomendada

Habitación principal:

* pistola no se compra, ya viene equipada;
* shotgun en pared izquierda;
* SMG en pared derecha;
* machine gun en una de las habitaciones laterales para obligar exploración.

---

# 13. Inventario del jugador

## 13.1 Armas poseídas

```ts id="1tczi8"
interface PlayerInventory {
  ownedWeapons: string[];
  currentWeaponId: string;
  weaponStates: Record<string, WeaponState>;
}
```

## 13.2 Cambio de armas

Controles:

```txt id="3agjwi"
1 — Pistol
2 — Shotgun
3 — Sub-Machine Gun
4 — Machine Gun
```

Reglas:

* solo puede cambiar a armas compradas;
* si intenta usar arma no comprada, no pasa nada;
* cambio de arma debe actualizar HUD.

---

# 14. Expansión del mapa

## 14.1 Nuevo layout

El mapa actual será la habitación principal.

Agregar:

1. habitación lateral izquierda conectada por puerta grande;
2. habitación lateral derecha conectada por puerta pequeña.

Las respuestas permanecen en la pared de la habitación principal.

## 14.2 Layout conceptual

```txt id="clna7q"
                [ Habitación lateral izquierda ]
                       Puerta grande
                            |
                            |
[ Habitación principal / Answer Wall / Arena ]
                            |
                            |
                       Puerta pequeña
                [ Habitación lateral derecha ]
```

## 14.3 Habitación principal

Debe contener:

* Answer Wall principal;
* pregunta actual;
* opciones A/B/C/D;
* spawn inicial del jugador;
* algunos spawns de zombies;
* al menos dos weapon wall purchases.

## 14.4 Habitación lateral izquierda

Puerta grande.

Uso sugerido:

* zona más abierta;
* spawn avanzado de zombies;
* posible shotgun wall buy;
* más espacio para pelear.

## 14.5 Habitación lateral derecha

Puerta pequeña.

Uso sugerido:

* pasillo más estrecho;
* machine gun o SMG wall buy;
* riesgo mayor;
* zombies pueden presionar al jugador.

## 14.6 Puertas

Para v0.2, las puertas pueden estar siempre abiertas.

No implementar compra de puertas todavía, salvo que sea fácil.

Futuro:

```txt id="mwpt6a"
Press E to open door — $750
```

## 14.7 MapBuilder

Actualizar:

```txt id="1o5r5o"
/src/environment/SubwayStationBuilder.ts
```

Debe retornar:

```ts id="0cmvqx"
interface SubwayStationBuildResult {
  playerSpawn: BABYLON.Vector3;
  enemySpawns: BABYLON.Vector3[];
  answerBoardAnchor: BABYLON.AbstractMesh;
  wallWeaponAnchors: WallWeaponAnchor[];
  roomBounds: RoomBounds[];
}
```

---

# 15. Dificultad por round

## 15.1 Aumentos progresivos

La dificultad debe subir con el round.

Variables:

* cantidad de zombies;
* velocidad de zombies;
* salud de zombies;
* daño al jugador;
* spawn rate;
* cantidad de distractores vivos;
* distancia de spawn.

## 15.2 Fórmula inicial

```ts id="ma0cgd"
function getRoundDifficulty(round: number): RoundDifficulty {
  return {
    zombieHealth: 100 + Math.floor((round - 1) / 5) * 15,
    zombieSpeed: 1.2 + Math.min(round * 0.035, 1.2),
    zombieDamage: 10 + Math.floor((round - 1) / 10) * 5,
    extraZombies: Math.floor((round - 1) / 3)
  }
}
```

## 15.3 Importante

Siempre debe existir al menos un zombie por opción A/B/C/D.

Los zombies extra pueden duplicar opciones incorrectas, pero nunca deben crear ambigüedad visual.

Regla:

```txt id="0raewi"
Los zombies extra deben usar labels de respuestas incorrectas.
Nunca duplicar la respuesta correcta en v0.2.
```

---

# 16. Gameplay por round

## 16.1 Inicio de round

1. Cargar pregunta del round actual.
2. Actualizar Answer Wall.
3. Spawn zombies.
4. Mostrar texto:

   * Round N;
   * país;
   * objetivo.
5. Empezar combate.

## 16.2 Durante el round

El jugador puede:

* moverse;
* disparar;
* recargar;
* comprar armas;
* cambiar armas;
* entrar en habitaciones laterales;
* mirar la pared de respuestas en la habitación principal.

## 16.3 Fin del round

Si gana:

* eliminar zombies restantes;
* sumar bonus opcional;
* avanzar round;
* actualizar Answer Wall;
* spawn nueva oleada.

Si pierde:

* detener enemigos;
* mostrar pantalla de run terminado;
* guardar récord si corresponde.

---

# 17. HUD actualizado

Mostrar siempre:

```txt id="88mkz5"
Round: 7
Record: 12
Money: $260
Weapon: SMG
Ammo: 18 / 90
Health: 75
Objective: Eliminate wrong answers. Protect correct answer.
```

Cuando mira wall buy:

```txt id="m48nmg"
Press E to buy Shotgun — $150
```

Cuando no tiene dinero:

```txt id="q4ausu"
Not enough money
```

Cuando recarga:

```txt id="bipame"
Reloading...
```

---

# 18. Nuevos módulos a crear

```txt id="yppd08"
/src/rounds
  RoundManager.ts
  RoundTypes.ts
  RecordManager.ts

/src/economy
  MoneyManager.ts

/src/weapons
  WeaponTypes.ts
  WeaponConfig.ts
  WeaponController.ts
  WeaponInventory.ts
  WallWeaponPurchase.ts

/src/enemies
  BoxZombie.ts
  ZombieAnimator.ts
  ZombieHitZones.ts

/src/environment
  RoomBuilder.ts
  DoorBuilder.ts
```

---

# 19. Cambios a módulos existentes

## FpsEliminationMode

Debe evolucionar para soportar rounds.

Nuevo nombre recomendado:

```txt id="5xv4wm"
RoundBasedCapitalSurvivalMode.ts
```

Responsabilidades:

* gestionar RoundManager;
* cargar pregunta del round;
* actualizar AnswerBoard;
* spawnear zombies;
* conectar kills con MoneyManager;
* conectar compras con WeaponInventory;
* evaluar victoria/derrota;
* avanzar o resetear run.

## Enemy

Reemplazar o extender con:

```txt id="lisfbx"
BoxZombie
```

## WeaponController

Debe soportar:

* múltiples armas;
* fire rate;
* reload;
* ammo;
* headshots;
* automatic fire.

## HUD

Debe mostrar:

* round;
* récord;
* dinero;
* arma;
* ammo;
* reload state;
* compra disponible;
* vida.

---

# 20. Orden de implementación recomendado

## Fase 1 — Dataset de capitales

Tareas:

1. Crear `capitals.rounds.json`.
2. Agregar mínimo 40 rounds.
3. Validar que cada round tenga una sola respuesta correcta.
4. Crear tests de validación del dataset.
5. Conectar RoundManager al JSON.

Definition of Done:

* el juego empieza siempre con Francia/París;
* al ganar avanza al siguiente país;
* al perder reinicia desde Round 1.

---

## Fase 2 — RoundManager y récord

Tareas:

1. Crear RoundManager.
2. Crear RecordManager con localStorage.
3. Mostrar round actual en HUD.
4. Mostrar récord actual en HUD.
5. Guardar récord al perder.

Definition of Done:

* si el jugador llega a Round 5 y pierde, se guarda récord 5;
* si luego llega a Round 7, se actualiza récord;
* si llega a Round 4, no reemplaza récord 7.

---

## Fase 3 — MoneyManager

Tareas:

1. Crear MoneyManager.
2. Iniciar run con $100.
3. Sumar $10 por standard kill.
4. Sumar $30 por one-shot headshot.
5. Mostrar dinero en HUD.
6. Resetear dinero al empezar run nuevo.

Definition of Done:

* dinero inicial es $100;
* body kill suma $10;
* one-shot headshot suma $30;
* dinero persiste entre rounds del mismo run;
* dinero resetea al perder y reiniciar.

---

## Fase 4 — BoxZombie humanoide

Tareas:

1. Crear zombie con boxes.
2. Crear head/torso/arms/legs.
3. Agregar metadata de hit zones.
4. Asegurar que raycast detecta parte impactada.
5. Calcular daño según zona.
6. Mantener label A/B/C/D sobre la cabeza.

Definition of Done:

* zombie ya no es una sola caja;
* headshots se detectan;
* body shots se detectan;
* label sigue visible.

---

## Fase 5 — Animación procedural

Tareas:

1. Crear ZombieAnimator.
2. Animar brazos.
3. Animar piernas.
4. Agregar bobbing leve de cabeza.
5. Detener animación al morir.

Definition of Done:

* zombies parecen caminar;
* animación es procedural;
* no usa assets externos.

---

## Fase 6 — Sistema de armas

Tareas:

1. Crear WeaponConfig.
2. Agregar pistol, shotgun, SMG, machine gun.
3. Implementar fire rate por RPM.
4. Implementar damage.
5. Implementar head multipliers.
6. Implementar automatic fire para SMG/machine gun.
7. Implementar shotgun pellets.

Definition of Done:

* pistola funciona como arma inicial;
* shotgun dispara múltiples pellets;
* SMG dispara automático;
* machine gun dispara automático;
* daños se aplican correctamente.

---

## Fase 7 — Munición y recarga

Tareas:

1. Agregar magazine.
2. Agregar reserve ammo.
3. Consumir ammo al disparar.
4. Implementar reload con delay.
5. Bloquear disparo durante reload.
6. Mostrar ammo en HUD.

Definition of Done:

* no se puede disparar sin ammo;
* tecla R recarga;
* reload tarda según arma;
* HUD muestra ammo correcto.

---

## Fase 8 — Wall weapon purchases

Tareas:

1. Crear WallWeaponPurchase.
2. Crear panel visual para shotgun.
3. Crear panel visual para SMG.
4. Crear panel visual para machine gun.
5. Detectar proximidad.
6. Comprar con tecla E.
7. Descontar dinero.
8. Agregar arma al inventario.

Definition of Done:

* jugador puede comprar shotgun si tiene $150;
* no puede comprar si no tiene dinero;
* arma comprada aparece disponible;
* HUD muestra prompt al acercarse.

---

## Fase 9 — Expansión de mapa

Tareas:

1. Agregar habitación lateral izquierda.
2. Agregar puerta grande.
3. Agregar habitación lateral derecha.
4. Agregar puerta pequeña.
5. Agregar spawns de zombies en habitaciones.
6. Agregar wall buys distribuidos.
7. Mantener Answer Wall en habitación principal.

Definition of Done:

* mapa tiene tres habitaciones conectadas;
* jugador puede entrar y salir;
* respuestas siguen visibles en habitación principal;
* zombies pueden aparecer en distintas habitaciones.

---

## Fase 10 — Integración y balance

Tareas:

1. Ajustar precios.
2. Ajustar daño.
3. Ajustar velocidad de zombies.
4. Ajustar rewards.
5. Ajustar dificultad por round.
6. Probar mínimo 10 rounds seguidos.
7. Revisar si el jugador puede comprar armas demasiado rápido o demasiado tarde.

Definition of Done:

* Round 1–5 son fáciles;
* Round 6–15 requieren mejor puntería;
* armas se sienten útiles;
* economía no está rota;
* perder reinicia desde el comienzo.

---

# 21. Balance inicial recomendado

## 21.1 Player

```ts id="1j3oc1"
player = {
  health: 100,
  startingMoney: 100,
  moveSpeed: 5.0,
  sprintSpeed: 7.5
}
```

## 21.2 Zombies

```ts id="pprbyz"
zombie = {
  baseHealth: 100,
  baseSpeed: 1.2,
  baseDamage: 10
}
```

## 21.3 Rewards

```ts id="4345rh"
rewards = {
  standardKill: 10,
  oneShotHeadshot: 30
}
```

## 21.4 Weapons

```ts id="f8tp6o"
pistol:       free, $0,   34 damage, 240 RPM, 12 mag, 48 reserve
shotgun:      $150,       6 pellets x 18 damage, 70 RPM, 6 mag, 24 reserve
SMG:          $250,       18 damage, 650 RPM, 30 mag, 120 reserve
machine gun:  $500,       26 damage, 550 RPM, 60 mag, 180 reserve
```

## 21.5 Compra esperada

Con buen gameplay:

```txt id="89ggrx"
Round 1–2: jugador usa pistola
Round 3–5: puede comprar shotgun
Round 6–9: puede comprar SMG
Round 10+: puede comprar machine gun
```

---

# 22. Criterios de aceptación finales para v0.2

v0.2 está completa cuando:

* el juego tiene mínimo 40 preguntas de capitales;
* las preguntas siguen orden fijo;
* el Round 1 siempre empieza igual;
* ganar avanza al siguiente round;
* perder reinicia desde Round 1;
* se guarda récord local;
* el jugador empieza con $100;
* matar zombie normal da $10;
* matar zombie con one-shot headshot da $30;
* zombies tienen cabeza, torso, brazos y piernas hechos con boxes;
* zombies tienen animación simple de caminar;
* se detectan headshots;
* existen shotgun, SMG y machine gun;
* cada arma tiene precio, daño, RPM, cargador, reserva y reload;
* el jugador puede comprar armas en la pared;
* el jugador puede recargar;
* el HUD muestra dinero, arma, ammo, round y récord;
* el mapa tiene habitación principal y dos habitaciones conectadas;
* las respuestas siguen visibles en la pared de la habitación principal.

---

# 23. Recomendación de implementación inmediata

El próximo commit no debería intentar hacer todo a la vez.

Orden recomendado para el siguiente sprint:

1. RoundManager + JSON de capitales.
2. RecordManager.
3. MoneyManager.
4. BoxZombie humanoide con hit zones.
5. WeaponConfig + ammo/reload.
6. Wall weapon purchases.
7. Habitaciones extra.

La prioridad debe ser:

```txt id="ph0qq5"
Primero: progresión educativa por rounds.
Segundo: economía.
Tercero: armas.
Cuarto: expansión visual/mapa.
```

La razón es simple: sin RoundManager, el juego sigue siendo un demo. Con RoundManager, ya empieza a sentirse como un producto real.
