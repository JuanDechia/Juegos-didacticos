import * as BABYLON from '@babylonjs/core';
import { BoxZombie } from '../enemies/BoxZombie';
import type { BoxZombieKillData } from '../enemies/BoxZombie';
import type { PlayerController } from './PlayerController';
import type { Question } from '../education/types';

export interface SpawnOptions {
  health: number;
  speed: number;
  damage: number;
  /** Zombies extra que repiten opciones incorrectas */
  extraZombies?: number;
}

/**
 * Gestiona el ciclo de vida de todos los BoxZombies activos.
 * Emite onEnemyKilled con datos completos de hit zone para el MoneyManager.
 */
export class EnemySpawner {
  private scene: BABYLON.Scene;
  private player: PlayerController;
  private activeZombies: Map<string, BoxZombie> = new Map();

  public onEnemyKilled: BABYLON.Observable<BoxZombieKillData & { enemyId: string }> =
    new BABYLON.Observable();

  constructor(scene: BABYLON.Scene, player: PlayerController) {
    this.scene = scene;
    this.player = player;
  }

  /**
   * Spawnea un zombie por cada opción de la pregunta.
   * Opcionalmente spawnea zombies extra (opciones incorrectas duplicadas).
   */
  public spawnOptions(
    question: Question,
    spawnPoints: BABYLON.Vector3[],
    opts: SpawnOptions,
  ): void {
    // Limpiar zombies anteriores
    this.disposeAll();

    const incorrectIds = question.options
      .filter(o => !o.isCorrect)
      .map(o => o.id);

    // Base: una opción por zombie
    const spawnQueue = [...question.options.map(o => o.id)];

    // Extras: duplicar incorrectos para rounds avanzados
    const extras = opts.extraZombies ?? 0;
    for (let i = 0; i < extras; i++) {
      spawnQueue.push(incorrectIds[i % incorrectIds.length]);
    }

    spawnQueue.forEach((optionId, index) => {
      const spawnPos = spawnPoints[index % spawnPoints.length] ?? new BABYLON.Vector3(0, 0, 5);
      const uid = Math.random().toString(36).substring(2, 7);
      const enemyId = `zombie_${optionId}_${uid}`;

      const zombie = new BoxZombie(
        this.scene,
        enemyId,
        optionId,
        spawnPos,
        this.player,
        opts.health,
        opts.speed,
        opts.damage,
      );

      this.activeZombies.set(enemyId, zombie);

      zombie.onKilled.add((data) => {
        this.onEnemyKilled.notifyObservers({ ...data, enemyId });
        this.activeZombies.delete(enemyId);
      });
    });
  }

  /**
   * Aplica daño a un zombie por su ID raíz.
   * Devuelve si se encontró y si seguía vivo.
   */
  public damageZombie(zombieId: string, damage: number, hitZone: import('../enemies/ZombieAnimator').HitZone): boolean {
    // zombieId puede ser el id de la raíz o de un sub-mesh
    // Buscar el zombie cuyo id está contenido en el zombieId recibido
    for (const [id, zombie] of this.activeZombies) {
      if (zombieId === id || zombieId.startsWith(id)) {
        if (zombie.isAlive) {
          zombie.takeDamage(damage, hitZone);
          return true;
        }
      }
    }
    return false;
  }

  public getActiveCount(): number {
    return this.activeZombies.size;
  }

  private disposeAll(): void {
    for (const zombie of this.activeZombies.values()) {
      zombie.dispose();
    }
    this.activeZombies.clear();
  }

  public dispose(): void {
    this.onEnemyKilled.clear();
    this.disposeAll();
  }
}
