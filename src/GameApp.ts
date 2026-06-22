import { SceneManager } from './core/SceneManager';
import { inputs } from './core/InputManager';
import { PlayerController } from './gameplay/PlayerController';
import { WeaponController } from './gameplay/WeaponController';
import { EnemySpawner } from './gameplay/EnemySpawner';
import { AnswerBoard } from './ui3d/AnswerBoard';
import { Hud } from './ui/Hud';
import { RoundBasedCapitalSurvivalMode } from './gameplay/RoundBasedCapitalSurvivalMode';
import { WeaponInventory } from './weapons/WeaponInventory';
import * as BABYLON from '@babylonjs/core';

export class GameApp {
  private sceneManager: SceneManager | null = null;
  private playerController: PlayerController | null = null;
  private weaponController: WeaponController | null = null;
  private enemySpawner: EnemySpawner | null = null;
  private answerBoard: AnswerBoard | null = null;
  private hud: Hud | null = null;
  private gameMode: RoundBasedCapitalSurvivalMode | null = null;
  private resizeHandler: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('No se encontró el elemento canvas #renderCanvas.');
      return;
    }

    // 1. Inicializar SceneManager
    this.sceneManager = new SceneManager(canvas);
    
    // Inyectar referencia de GameApp en la escena para accesos globales seguros
    const scene = this.sceneManager.getScene();
    (scene as any).gameApp = this;

    // 2. Inicializar InputManager con el canvas
    inputs.initialize(canvas);

    // 3. Crear el HUD HTML
    this.hud = new Hud();

    // 4. Inicializar PlayerController usando la cámara activa
    const camera = this.sceneManager.getActiveCamera() as BABYLON.FreeCamera;

    if (scene && camera) {
      this.playerController = new PlayerController(scene, camera);

      // Sincronizar salud inicial y cambios de salud con el HUD
      this.hud.updateHealth(
        this.playerController.getHealth(),
        this.playerController.getMaxHealth()
      );

      this.playerController.onDamageTaken.add((currentHealth) => {
        this.hud?.updateHealth(currentHealth, this.playerController!.getMaxHealth());
      });

      // 5. Inicializar WeaponInventory y WeaponController
      const inventory = new WeaponInventory();
      this.weaponController = new WeaponController(scene, camera, inventory);

      // 6. Inicializar AnswerBoard 3D en el anchor mesh
      const mapResult = this.sceneManager.getMapResult();
      if (mapResult && mapResult.answerBoardAnchor) {
        this.answerBoard = new AnswerBoard(mapResult.answerBoardAnchor);
      }

      // 7. Inicializar EnemySpawner
      this.enemySpawner = new EnemySpawner(scene, this.playerController);

      // 8. Crear y arrancar RoundBasedCapitalSurvivalMode
      if (this.answerBoard && this.weaponController && this.enemySpawner && mapResult) {
        this.gameMode = new RoundBasedCapitalSurvivalMode(
          scene,
          canvas,
          this.playerController,
          this.weaponController,
          this.enemySpawner,
          this.answerBoard,
          this.hud,
          mapResult.enemySpawns,
          mapResult.wallWeaponAnchors,
          inventory
        );

        // Arrancar el juego en estado intro
        this.gameMode.start();
      }
    }

    // Manejar resize
    this.resizeHandler = () => {
      if (this.sceneManager) {
        this.sceneManager.resize();
      }
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  public getSceneManager(): SceneManager | null {
    return this.sceneManager;
  }

  public getPlayerController(): PlayerController | null {
    return this.playerController;
  }

  public getHud(): Hud | null {
    return this.hud;
  }

  public getGameMode(): RoundBasedCapitalSurvivalMode | null {
    return this.gameMode;
  }

  public dispose(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.gameMode) {
      this.gameMode.dispose();
      this.gameMode = null;
    }
    if (this.enemySpawner) {
      this.enemySpawner.dispose();
      this.enemySpawner = null;
    }
    if (this.answerBoard) {
      this.answerBoard.dispose();
      this.answerBoard = null;
    }
    if (this.weaponController) {
      this.weaponController.dispose();
      this.weaponController = null;
    }
    if (this.playerController) {
      this.playerController.dispose();
      this.playerController = null;
    }
    if (this.hud) {
      this.hud.dispose();
      this.hud = null;
    }
    inputs.dispose();
    if (this.sceneManager) {
      this.sceneManager.dispose();
      this.sceneManager = null;
    }
  }
}
