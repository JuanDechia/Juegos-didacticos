import * as BABYLON from '@babylonjs/core';
import type { GameMode } from './GameMode';
import type { Question, GameConfig } from '../education/types';
import { QuestionLoader } from '../education/QuestionLoader';
import { QuestionEvaluator } from '../education/QuestionEvaluator';
import { PlayerController } from './PlayerController';
import { WeaponController } from './WeaponController';
import { EnemySpawner } from './EnemySpawner';
import { AnswerBoard } from '../ui3d/AnswerBoard';
import { Hud } from '../ui/Hud';
import { StartScreen } from '../ui/StartScreen';
import { EndScreen } from '../ui/EndScreen';
import { AudioSynth } from '../utils/AudioSynth';
// Cargar la pregunta por defecto desde el JSON
import geographyQuestion from '../content/lessons/geography.france.json';

export type GameState = 'intro' | 'reading' | 'playing' | 'won' | 'lost';

export class FpsEliminationMode implements GameMode {
  private scene: BABYLON.Scene;
  private canvas: HTMLCanvasElement;

  private state: GameState = 'intro';
  private config: GameConfig;
  private question: Question;
  private evaluator: QuestionEvaluator;

  // Controladores y UI
  private player: PlayerController;
  private weapon: WeaponController;
  private spawner: EnemySpawner;
  private board: AnswerBoard;
  private hud: Hud;

  // Pantallas
  private startScreen: StartScreen | null = null;
  private endScreen: EndScreen | null = null;

  // Variables de control y estadísticas
  private startTime = 0;
  private endTime = 0;
  private eliminatedOptionIds: string[] = [];
  private wronglyEliminatedCorrectOption = false;
  private readingTimeoutId: number | null = null;

  // Observers de eventos
  private onEnemyKilledObserver: BABYLON.Observer<any> | null = null;
  private onPlayerDeathObserver: BABYLON.Observer<void> | null = null;
  private onPlayerDamageObserver: BABYLON.Observer<number> | null = null;
  private onWeaponShootObserver: BABYLON.Observer<void> | null = null;
  private onWeaponHitObserver: BABYLON.Observer<any> | null = null;
  private keyboardObserver: BABYLON.Observer<BABYLON.KeyboardInfo> | null = null;
  private aimUpdateObserver: BABYLON.Observer<BABYLON.Scene> | null = null;

  constructor(
    scene: BABYLON.Scene,
    canvas: HTMLCanvasElement,
    player: PlayerController,
    weapon: WeaponController,
    spawner: EnemySpawner,
    board: AnswerBoard,
    hud: Hud,
    config: Partial<GameConfig> = {}
  ) {
    this.scene = scene;
    this.canvas = canvas;
    this.player = player;
    this.weapon = weapon;
    this.spawner = spawner;
    this.board = board;
    this.hud = hud;

    // Configuración inicial
    this.config = {
      strictCorrectKillGameOver: config.strictCorrectKillGameOver ?? true,
      playerHealth: config.playerHealth ?? 100,
      enemyDamage: config.enemyDamage ?? 10,
      enemySpeed: config.enemySpeed ?? 1.5,
      weaponCooldownMs: config.weaponCooldownMs ?? 250,
      maxGameTimeMs: config.maxGameTimeMs,
    };

    // 1. Cargar pregunta educativa
    this.question = QuestionLoader.loadFromObject(geographyQuestion);
    this.evaluator = new QuestionEvaluator(this.question);
  }

  /**
   * Inicia el ciclo del modo de juego
   */
  public start(): void {
    this.setGameState('intro');
  }

  private setGameState(newState: GameState): void {
    this.state = newState;

    switch (newState) {
      case 'intro':
        this.resetGameValues();
        // Ocultar HUD y liberar pointer lock
        this.hud.setVisible(false);
        document.exitPointerLock();

        // Mostrar menú de inicio
        this.startScreen = new StartScreen(
          this.question.subject,
          this.question.prompt,
          () => {
            this.setGameState('reading');
          }
        );
        break;

      case 'reading':
        // Mostrar HUD
        this.hud.setVisible(true);
        this.hud.updateProgress(0, this.evaluator.getIncorrectOptionIds().length);
        this.hud.updateObjective(this.question.prompt, this.evaluator.getCorrectOption().id);

        // Inicializar el tablero 3D con la pregunta
        this.board.setQuestion(this.question);

        // Bloquear el mouse para disparar/mover
        this.canvas.requestPointerLock();

        // Registrar teclas y eventos
        this.setupEventListeners();

        // Spawnear enemigos inmóviles durante el delay de lectura (velocidad = 0)
        const spawns = (this.scene as any).gameApp?.sceneManager?.getMapResult()?.enemySpawns || [];
        this.spawner.spawnOptions(this.question, spawns, { health: 100, speed: 0, damage: 10 });

        // Delay de lectura: 3 segundos
        this.startTime = performance.now();
        this.readingTimeoutId = window.setTimeout(() => {
          this.setGameState('playing');
        }, 3000);
        break;

      case 'playing':
        if (this.readingTimeoutId) {
          clearTimeout(this.readingTimeoutId);
          this.readingTimeoutId = null;
        }

        // Activar la IA de persecución en los enemigos (velocidad normal)
        const mapSpawns = (this.scene as any).gameApp?.sceneManager?.getMapResult()?.enemySpawns || [];
        this.spawner.spawnOptions(this.question, mapSpawns, { health: 100, speed: 1.0, damage: 10 });

        // Iniciar el loop de actualización del AimTooltip
        this.setupAimUpdateLoop();
        break;

      case 'won':
        this.end(true);
        break;

      case 'lost':
        this.end(false);
        break;
    }
  }

  /**
   * Loop de actualización del AimTooltip: detecta hacia qué enemigo apunta el jugador
   */
  private setupAimUpdateLoop(): void {
    if (this.aimUpdateObserver) {
      this.scene.onBeforeRenderObservable.remove(this.aimUpdateObserver);
    }

    this.aimUpdateObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (this.state !== 'playing') return;

      const camera = this.scene.activeCamera;
      if (!camera) return;

      const ray = this.scene.createPickingRay(
        this.scene.getEngine().getRenderWidth() / 2,
        this.scene.getEngine().getRenderHeight() / 2,
        BABYLON.Matrix.Identity(),
        camera
      );

      const hit = this.scene.pickWithRay(ray, (mesh) => {
        return mesh.name.startsWith('enemy_') && mesh.isEnabled();
      });

      if (hit && hit.hit && hit.pickedMesh) {
        // Extraer el optionId del nombre del mesh
        const meshName = hit.pickedMesh.name;
        const parts = meshName.split('_'); // formato: enemy_OPTIONID_uid
        const optionId = parts[1] || '';

        const option = this.question.options.find((o) => o.id === optionId);
        if (option) {
          this.hud.setCrosshairAimed(true);
          return;
        }
      }

      // No apunta a ningún enemigo
      this.hud.setCrosshairAimed(false);
    });
  }

  private setupEventListeners(): void {
    this.cleanupEventListeners();

    // 1. Escuchar muertes de enemigos
    this.onEnemyKilledObserver = this.spawner.onEnemyKilled.add((data) => {
      this.handleEnemyKilled(data.optionId);
    });

    // 1b. Conectar el arma: cuando el raycast golpea un mesh de enemigo, hacerle daño
    this.onWeaponHitObserver = this.weapon.onEnemyHit.add((hitEvt) => {
      this.spawner.damageZombie(hitEvt.zombieId, hitEvt.damage, hitEvt.hitZone);
    });

    // 2. Escuchar muerte del jugador
    this.onPlayerDeathObserver = this.player.onDeath.add(() => {
      AudioSynth.playDefeat();
      this.setGameState('lost');
    });

    // 3. Escuchar daño al jugador → flash de pantalla
    this.onPlayerDamageObserver = this.player.onDamageTaken.add(() => {
      this.hud.flashDamage();
    });

    // 4. Tecla R para reiniciar
    this.keyboardObserver = this.scene.onKeyboardObservable.add((kbInfo) => {
      if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
        if (kbInfo.event.key.toLowerCase() === 'r') {
          this.setGameState('intro');
        }
      }
    });
  }

  private cleanupEventListeners(): void {
    if (this.onEnemyKilledObserver) {
      this.spawner.onEnemyKilled.remove(this.onEnemyKilledObserver);
      this.onEnemyKilledObserver = null;
    }
    if (this.onPlayerDeathObserver) {
      this.player.onDeath.remove(this.onPlayerDeathObserver);
      this.onPlayerDeathObserver = null;
    }
    if (this.onPlayerDamageObserver) {
      this.player.onDamageTaken.remove(this.onPlayerDamageObserver);
      this.onPlayerDamageObserver = null;
    }
    if (this.onWeaponShootObserver) {
      this.weapon.onShoot.remove(this.onWeaponShootObserver);
      this.onWeaponShootObserver = null;
    }
    if (this.onWeaponHitObserver) {
      this.weapon.onEnemyHit.remove(this.onWeaponHitObserver);
      this.onWeaponHitObserver = null;
    }
    if (this.keyboardObserver) {
      this.scene.onKeyboardObservable.remove(this.keyboardObserver);
      this.keyboardObserver = null;
    }
    if (this.aimUpdateObserver) {
      this.scene.onBeforeRenderObservable.remove(this.aimUpdateObserver);
      this.aimUpdateObserver = null;
    }
  }

  private handleEnemyKilled(optionId: string): void {
    if (this.state !== 'playing') return;

    if (this.evaluator.isCorrectOption(optionId)) {
      // El jugador eliminó la correcta → Error grave
      this.wronglyEliminatedCorrectOption = true;
      AudioSynth.playError();
      this.hud.showKillFeed(`❌ ¡Opción ${optionId} era la CORRECTA!`, false);

      if (this.config.strictCorrectKillGameOver) {
        this.setGameState('lost');
      }
    } else {
      // El jugador eliminó una incorrecta → Progreso
      if (!this.eliminatedOptionIds.includes(optionId)) {
        this.eliminatedOptionIds.push(optionId);
        this.board.markOptionEliminated(optionId);
        AudioSynth.playCorrectHit();
        this.hud.showKillFeed(`✓ Opción ${optionId} eliminada`, true);

        const totalIncorrect = this.evaluator.getIncorrectOptionIds().length;
        this.hud.updateProgress(this.eliminatedOptionIds.length, totalIncorrect);

        // Verificar condición de victoria: eliminó todas las incorrectas
        if (this.eliminatedOptionIds.length === totalIncorrect) {
          this.setGameState('won');
        }
      }
    }
  }

  public update(_deltaSeconds: number): void {
    // La máquina de estados principal actualiza mediante eventos.
    // El loop de aim se maneja en onBeforeRenderObservable.
  }

  /**
   * Finaliza la partida, calculando resultados y mostrando pantalla final
   */
  public end(victory: boolean): void {
    this.endTime = performance.now();
    const elapsedMs = this.endTime - this.startTime;

    this.cleanupEventListeners();
    document.exitPointerLock();

    this.hud.setCrosshairAimed(false);

    // Sonido de resultado
    if (victory) {
      AudioSynth.playVictory();
    } else {
      AudioSynth.playDefeat();
    }

    // En el MVP eliminamos los restantes del registro
    this.spawner.dispose();

    // Actualizar AnswerBoard 3D
    this.board.showResult(
      this.evaluator.getCorrectOption().id,
      this.question.explanation
    );

    // Preparar el resultado
    const result = {
      questionId: this.question.id,
      status: victory ? ('won' as const) : ('lost' as const),
      correctOptionId: this.evaluator.getCorrectOption().id,
      eliminatedOptionIds: this.eliminatedOptionIds,
      wronglyEliminatedCorrectOption: this.wronglyEliminatedCorrectOption,
      elapsedMs,
      shotsFired: this.weapon.getShotsFired(),
      hits: this.weapon.getHits(),
      accuracy: this.weapon.getAccuracy(),
    };

    // Crear la EndScreen
    this.endScreen = new EndScreen(
      result,
      this.question.explanation,
      () => {
        this.setGameState('intro');
      }
    );
  }

  private resetGameValues(): void {
    if (this.readingTimeoutId) {
      clearTimeout(this.readingTimeoutId);
      this.readingTimeoutId = null;
    }

    this.eliminatedOptionIds = [];
    this.wronglyEliminatedCorrectOption = false;

    this.player.reset();
    this.weapon.reset();
    this.spawner.dispose();

    if (this.startScreen) {
      this.startScreen.dispose();
      this.startScreen = null;
    }
    if (this.endScreen) {
      this.endScreen.dispose();
      this.endScreen = null;
    }
  }

  public dispose(): void {
    this.resetGameValues();
    this.cleanupEventListeners();
  }
}
