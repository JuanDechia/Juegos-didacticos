import { Enemy } from './Enemy';

export class EnemyRegistry {
  private enemies: Map<string, Enemy> = new Map();

  /**
   * Registra un enemigo activo
   */
  public register(enemy: Enemy): void {
    this.enemies.set(enemy.mesh.name, enemy);
  }

  /**
   * Desregistra y elimina un enemigo
   */
  public unregister(meshName: string): void {
    const enemy = this.enemies.get(meshName);
    if (enemy) {
      enemy.dispose();
      this.enemies.delete(meshName);
    }
  }

  /**
   * Obtiene un enemigo a partir de su ID de mesh
   */
  public get(meshName: string): Enemy | undefined {
    return this.enemies.get(meshName);
  }

  /**
   * Obtiene todos los enemigos registrados actualmente
   */
  public getAll(): Enemy[] {
    return Array.from(this.enemies.values());
  }

  /**
   * Destruye todos los enemigos registrados y limpia el mapa
   */
  public clear(): void {
    this.enemies.forEach(enemy => enemy.dispose());
    this.enemies.clear();
  }
}
export const enemyRegistry = new EnemyRegistry();
