import * as BABYLON from '@babylonjs/core';
import type { GameMode } from './GameMode';
import { PlayerController } from './PlayerController';
import { WeaponController } from './WeaponController';
import { EnemySpawner } from './EnemySpawner';
import { AnswerBoard } from '../ui3d/AnswerBoard';
import { Hud } from '../ui/Hud';
import { StartScreen } from '../ui/StartScreen';
import { EndScreen } from '../ui/EndScreen';
import { AudioSynth } from '../utils/AudioSynth';
import { RoundManager } from '../rounds/RoundManager';
import { MoneyManager } from '../economy/MoneyManager';
import { WeaponInventory } from '../weapons/WeaponInventory';
import { WallWeaponPurchase } from '../weapons/WallWeaponPurchase';
import type { WallWeaponAnchor } from '../environment/SubwayStationBuilder';
import { QuestionEvaluator } from '../education/QuestionEvaluator';

export type SurvivalGameState = 'intro' | 'reading' | 'playing' | 'won_round' | 'lost_run';

const STARTING_MONEY = 100;
const STANDARD_KILL_REWARD = 10;
const HEADSHOT_KILL_REWARD = 30;
const READING_DELAY_MS = 4000;

/**
 * Modo de juego principal de v0.2:
 * Survival por rounds con preguntas de capitales determinísticas.
 */
export class RoundBasedCapitalSurvivalMode implements GameMode {
  private scene: BABYLON.Scene;
  private canvas: HTMLCanvasElement;

  private state: SurvivalGameState = 'intro';

  // Controladores de gameplay
  private player: PlayerController;
  private weapon: WeaponController;
  private spawner: EnemySpawner;
  private board: AnswerBoard;
  private hud: Hud;

  // Sistemas v0.2
  private roundManager: RoundManager;
  private money: MoneyManager;
  private inventory: WeaponInventory;
  private wallWeapons: WallWeaponPurchase[] = [];

  // Evaluador de la pregunta actual
  private evaluator!: QuestionEvaluator;

  // Estado de ronda
  private eliminatedOptionIds: string[] = [];
  private wronglyEliminatedCorrect = false;
  private startTime = 0;
  private readingTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Mapa: spawn points del mapa
  private enemySpawnPoints: BABYLON.Vector3[] = [];

  // UI
  private startScreen: StartScreen | null = null;
  private endScreen: EndScreen | null = null;

  // Observers
  private onEnemyKilledObs: BABYLON.Observer<any> | null = null;
  private onWeaponHitObs: BABYLON.Observer<any> | null = null;
  private onPlayerDeathObs: BABYLON.Observer<void> | null = null;
  private onPlayerDamageObs: BABYLON.Observer<number> | null = null;
  private keyboardObs: BABYLON.Observer<BABYLON.KeyboardInfo> | null = null;
  private aimUpdateObs: BABYLON.Observer<BABYLON.Scene> | null = null;
  private wallUpdateObs: BABYLON.Observer<BABYLON.Scene> | null = null;

  constructor(
    scene: BABYLON.Scene,
    canvas: HTMLCanvasElement,
    player: PlayerController,
    weapon: WeaponController,
    spawner: EnemySpawner,
    board: AnswerBoard,
    hud: Hud,
    enemySpawnPoints: BABYLON.Vector3[],
    wallWeaponAnchors: WallWeaponAnchor[],
    inventory: WeaponInventory,
  ) {
    this.scene = scene;
    this.canvas = canvas;
    this.player = player;
    this.weapon = weapon;
    this.spawner = spawner;
    this.board = board;
    this.hud = hud;
    this.enemySpawnPoints = enemySpawnPoints;

    // Sistemas
    this.roundManager = new RoundManager();
    this.money = new MoneyManager(STARTING_MONEY);
    this.inventory = inventory;

    // Panels de compra de armas en pared
    wallWeaponAnchors.forEach(anchor => {
      const panel = new WallWeaponPurchase(scene, {
        weaponId: anchor.weaponId as any,
        position: anchor.position,
        rotationY: anchor.rotationY,
        interactionRadius: 2.8,
      });
      this.wallWeapons.push(panel);
    });

    // Sincronizar HUD con dinero
    this.money.onMoneyChanged.add(amount => {
      this.hud.updateMoney(amount);
    });

    // Sincronizar HUD con arma/ammo
    this.inventory.onWeaponChanged.add(evt => {
      this.hud.updateWeapon(evt.displayName, evt.ammoInMagazine, evt.reserveAmmo);
    });
    this.inventory.onReloadStateChanged.add(isReloading => {
      this.hud.showReloadIndicator(isReloading);
    });
  }

  // ─── Entrada al modo ──────────────────────────────────────────────────────

  public start(): void {
    this.setGameState('intro');
  }

  // ─── Máquina de estados ───────────────────────────────────────────────────

  private setGameState(newState: SurvivalGameState): void {
    this.state = newState;

    switch (newState) {
      case 'intro':
        this.enterIntro();
        break;
      case 'reading':
        this.enterReading();
        break;
      case 'playing':
        this.enterPlaying();
        break;
      case 'won_round':
        this.enterWonRound();
        break;
      case 'lost_run':
        this.enterLostRun();
        break;
    }
  }

  // ─── Estado: Intro ────────────────────────────────────────────────────────

  private enterIntro(): void {
    this.resetRunValues();
    this.hud.setVisible(false);
    document.exitPointerLock();

    // Iniciar un nuevo run
    this.roundManager.startNewRun(STARTING_MONEY);
    this.money.reset();
    this.inventory.reset();

    const record = this.roundManager.getBestRecord();

    this.startScreen = new StartScreen(
      'Geografía — Capitales del Mundo',
      `¿Conoces las capitales? ¡Récord actual: Round ${record.bestRound}!`,
      () => this.setGameState('reading'),
    );
  }

  // ─── Estado: Lectura ──────────────────────────────────────────────────────

  private enterReading(): void {
    const question = this.roundManager.getCurrentQuestion();
    this.evaluator = new QuestionEvaluator(question);
    this.eliminatedOptionIds = [];
    this.wronglyEliminatedCorrect = false;

    // Actualizar HUD
    const roundNum = this.roundManager.getCurrentRoundNumber();
    const record = this.roundManager.getBestRecord();

    this.hud.setVisible(true);
    this.hud.updateRound(roundNum, record.bestRound);
    this.hud.updateMoney(this.money.getMoney());
    this.hud.updateProgress(0, this.evaluator.getIncorrectOptionIds().length);
    this.hud.updateObjective(question.prompt, this.evaluator.getCorrectOption().id);

    // Mostrar board 3D
    this.board.setQuestion(question);

    this.canvas.requestPointerLock();
    this.setupEventListeners();

    // Spawn zombies inmóviles durante el delay de lectura
    const diff = this.roundManager.getRoundDifficulty();
    this.spawner.spawnOptions(question, this.enemySpawnPoints, {
      health: diff.zombieHealth,
      speed: 0,
      damage: diff.zombieDamage,
      extraZombies: diff.extraZombies,
    });

    this.startTime = performance.now();
    this.readingTimeoutId = setTimeout(() => {
      this.setGameState('playing');
    }, READING_DELAY_MS);
  }

  // ─── Estado: Jugando ──────────────────────────────────────────────────────

  private enterPlaying(): void {
    if (this.readingTimeoutId) {
      clearTimeout(this.readingTimeoutId);
      this.readingTimeoutId = null;
    }

    // Re-spawn con velocidad real
    const question = this.roundManager.getCurrentQuestion();
    const diff = this.roundManager.getRoundDifficulty();
    this.spawner.spawnOptions(question, this.enemySpawnPoints, {
      health: diff.zombieHealth,
      speed: diff.zombieSpeed,
      damage: diff.zombieDamage,
      extraZombies: diff.extraZombies,
    });

    this.setupAimUpdateLoop();
    this.setupWallWeaponUpdateLoop();
  }

  // ─── Estado: Round ganado ─────────────────────────────────────────────────

  private enterWonRound(): void {
    AudioSynth.playVictory();

    this.cleanupEventListeners();
    this.spawner.dispose();
    this.board.showResult(
      this.evaluator.getCorrectOption().id,
      this.roundManager.getCurrentQuestion().explanation,
    );

    const roundNum = this.roundManager.getCurrentRoundNumber();

    // Avanzar round después de un delay breve
    this.hud.showKillFeed(`✅ Round ${roundNum} completado! Avanzando...`, true);

    setTimeout(() => {
      this.roundManager.advanceToNextRound();
      this.setGameState('reading');
    }, 3500);
  }

  // ─── Estado: Run perdido ──────────────────────────────────────────────────

  private enterLostRun(): void {
    AudioSynth.playDefeat();

    this.cleanupEventListeners();
    this.hud.setCrosshairAimed(false);

    this.roundManager.loseRun();
    const record = this.roundManager.getBestRecord();

    this.spawner.dispose();

    const question = this.roundManager.getCurrentQuestion();
    this.board.showResult(
      this.evaluator.getCorrectOption().id,
      question.explanation,
    );

    const result = {
      questionId: question.id,
      status: 'lost' as const,
      correctOptionId: this.evaluator.getCorrectOption().id,
      eliminatedOptionIds: this.eliminatedOptionIds,
      wronglyEliminatedCorrectOption: this.wronglyEliminatedCorrect,
      elapsedMs: performance.now() - this.startTime,
      shotsFired: this.weapon.getShotsFired(),
      hits: this.weapon.getHits(),
      accuracy: this.weapon.getAccuracy(),
      roundReached: this.roundManager.getCurrentRoundNumber(),
      bestRound: record.bestRound,
    };

    document.exitPointerLock();

    this.endScreen = new EndScreen(
      result,
      question.explanation,
      () => this.setGameState('intro'),
    );
  }

  // ─── Manejo de eventos ────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.cleanupEventListeners();

    // Weapon hits → daño al zombie
    this.onWeaponHitObs = this.weapon.onEnemyHit.add((hitEvt) => {
      this.spawner.damageZombie(hitEvt.zombieId, hitEvt.damage, hitEvt.hitZone);
    });

    // Enemy killed → progreso educativo + dinero
    this.onEnemyKilledObs = this.spawner.onEnemyKilled.add((data) => {
      this.handleEnemyKilled(data.optionId, data.hitZone, data.wasOneShotHeadshot);
    });

    // Muerte del jugador
    this.onPlayerDeathObs = this.player.onDeath.add(() => {
      this.setGameState('lost_run');
    });

    // Daño al jugador
    this.onPlayerDamageObs = this.player.onDamageTaken.add(() => {
      this.hud.flashDamage();
    });

    // Tecla E → comprar arma
    this.keyboardObs = this.scene.onKeyboardObservable.add((kbInfo) => {
      if (
        kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN &&
        kbInfo.event.key.toLowerCase() === 'e'
      ) {
        const camPos = this.scene.activeCamera?.position;
        if (!camPos) return;
        for (const panel of this.wallWeapons) {
          if (panel.canInteract(camPos)) {
            const result = panel.tryPurchase(this.inventory, this.money);
            if (result === 'not_enough_money') {
              this.hud.showKillFeed('❌ Not enough money', false);
            } else if (result === 'purchased') {
              const state = this.inventory.getCurrentState();
              this.hud.updateWeapon(
                this.inventory.getCurrentWeaponId(),
                state.ammoInMagazine,
                state.reserveAmmo,
              );
              this.hud.showKillFeed('✓ Weapon purchased!', true);
            }
            break;
          }
        }
      }
    });
  }

  private handleEnemyKilled(
    optionId: string,
    _hitZone: import('../enemies/ZombieAnimator').HitZone,
    wasOneShotHeadshot: boolean,
  ): void {
    if (this.state !== 'playing') return;

    if (this.evaluator.isCorrectOption(optionId)) {
      // Eliminó la respuesta correcta
      this.wronglyEliminatedCorrect = true;
      AudioSynth.playError();
      this.hud.showKillFeed(`❌ ¡Opción ${optionId} era la CORRECTA!`, false);
      this.setGameState('lost_run');
      return;
    }

    // Eliminó una incorrecta — dar dinero
    const reward = wasOneShotHeadshot ? HEADSHOT_KILL_REWARD : STANDARD_KILL_REWARD;
    this.money.addMoney(reward, wasOneShotHeadshot ? 'one_shot_headshot' : 'standard_kill');

    const feedMsg = wasOneShotHeadshot
      ? `💀 HEADSHOT! +$${reward}`
      : `✓ Opción ${optionId} eliminada +$${reward}`;
    const isPositive = true;

    AudioSynth.playCorrectHit();
    this.hud.showKillFeed(feedMsg, isPositive);

    if (!this.eliminatedOptionIds.includes(optionId)) {
      this.eliminatedOptionIds.push(optionId);
      this.board.markOptionEliminated(optionId);
    }

    const totalIncorrect = this.evaluator.getIncorrectOptionIds().length;
    this.hud.updateProgress(this.eliminatedOptionIds.length, totalIncorrect);

    // Victoria: todas las incorrectas eliminadas
    if (this.eliminatedOptionIds.length >= totalIncorrect) {
      this.setGameState('won_round');
    }
  }

  // ─── Loop de aim tooltip ──────────────────────────────────────────────────

  private setupAimUpdateLoop(): void {
    if (this.aimUpdateObs) {
      this.scene.onBeforeRenderObservable.remove(this.aimUpdateObs);
    }

    this.aimUpdateObs = this.scene.onBeforeRenderObservable.add(() => {
      if (this.state !== 'playing') return;
      const camera = this.scene.activeCamera;
      if (!camera) return;

      const ray = this.scene.createPickingRay(
        this.scene.getEngine().getRenderWidth() / 2,
        this.scene.getEngine().getRenderHeight() / 2,
        BABYLON.Matrix.Identity(),
        camera,
      );

      const hit = this.scene.pickWithRay(ray, (mesh) => {
        return mesh.metadata?.type === 'zombie_hitbox' && mesh.isEnabled();
      });

      const question = this.roundManager.getCurrentQuestion();

      if (hit?.hit && hit.pickedMesh) {
        const optionId: string = hit.pickedMesh.metadata?.zombieId?.split('_')[1] ?? '';
        const option = question.options.find(o => o.id === optionId);
        if (option) {
          this.hud.setCrosshairAimed(true);
          return;
        }
      }

      this.hud.setCrosshairAimed(false);
    });
  }

  // ─── Loop de wall weapons ─────────────────────────────────────────────────

  private setupWallWeaponUpdateLoop(): void {
    if (this.wallUpdateObs) {
      this.scene.onBeforeRenderObservable.remove(this.wallUpdateObs);
    }

    this.wallUpdateObs = this.scene.onBeforeRenderObservable.add(() => {
      const camPos = this.scene.activeCamera?.position;
      if (!camPos) return;

      let nearAny = false;
      for (const panel of this.wallWeapons) {
        panel.update(camPos);
        if (panel.canInteract(camPos)) nearAny = true;
      }

      // Actualizar prompt de compra en HUD
      if (nearAny) {
        const camPos2 = this.scene.activeCamera!.position;
        for (const panel of this.wallWeapons) {
          if (panel.canInteract(camPos2)) {
            this.hud.showBuyPrompt('Press E to buy');
            return;
          }
        }
      }
      this.hud.hideBuyPrompt();
    });
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  private cleanupEventListeners(): void {
    if (this.onEnemyKilledObs) { this.spawner.onEnemyKilled.remove(this.onEnemyKilledObs); this.onEnemyKilledObs = null; }
    if (this.onWeaponHitObs) { this.weapon.onEnemyHit.remove(this.onWeaponHitObs); this.onWeaponHitObs = null; }
    if (this.onPlayerDeathObs) { this.player.onDeath.remove(this.onPlayerDeathObs); this.onPlayerDeathObs = null; }
    if (this.onPlayerDamageObs) { this.player.onDamageTaken.remove(this.onPlayerDamageObs); this.onPlayerDamageObs = null; }
    if (this.keyboardObs) { this.scene.onKeyboardObservable.remove(this.keyboardObs); this.keyboardObs = null; }
    if (this.aimUpdateObs) { this.scene.onBeforeRenderObservable.remove(this.aimUpdateObs); this.aimUpdateObs = null; }
    if (this.wallUpdateObs) { this.scene.onBeforeRenderObservable.remove(this.wallUpdateObs); this.wallUpdateObs = null; }
  }

  private resetRunValues(): void {
    if (this.readingTimeoutId) {
      clearTimeout(this.readingTimeoutId);
      this.readingTimeoutId = null;
    }
    this.eliminatedOptionIds = [];
    this.wronglyEliminatedCorrect = false;
    this.player.reset();
    this.weapon.reset();
    this.spawner.dispose();
    this.startScreen?.dispose();
    this.startScreen = null;
    this.endScreen?.dispose();
    this.endScreen = null;
    this.hud.hideBuyPrompt();
  }

  public update(_dt: number): void { /* manejado via observables */ }

  public end(victory: boolean): void {
    if (victory) {
      this.setGameState('won_round');
    } else {
      this.setGameState('lost_run');
    }
  }

  public dispose(): void {
    this.resetRunValues();
    this.cleanupEventListeners();
    this.money.dispose();
    this.inventory.dispose();
    this.wallWeapons.forEach(w => w.dispose());
  }
}
