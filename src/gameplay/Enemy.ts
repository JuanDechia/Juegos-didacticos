import * as BABYLON from '@babylonjs/core';
import { FloatingLabel } from '../ui3d/FloatingLabel';
import type { PlayerController } from './PlayerController';

export interface EnemyInstance {
  id: string;
  optionId: string;
  mesh: BABYLON.AbstractMesh;
  isAlive: boolean;
  kill(): void;
  dispose(): void;
}

export class Enemy implements EnemyInstance {
  public id: string;
  public optionId: string;
  public mesh: BABYLON.Mesh;
  public isAlive = true;

  private scene: BABYLON.Scene;
  private player: PlayerController;
  private label: FloatingLabel;

  // Propiedades de gameplay
  private speed = 1.5;
  private damage = 10;
  private damageRadius = 1.3;
  private lastAttackTime = 0;
  private attackCooldownMs = 1200;

  // Observables
  public onKilled: BABYLON.Observable<string> = new BABYLON.Observable();
  private updateObserver: BABYLON.Observer<BABYLON.Scene> | null = null;

  constructor(
    scene: BABYLON.Scene,
    id: string,
    optionId: string,
    spawnPoint: BABYLON.Vector3,
    player: PlayerController,
    speedFactor = 1.0
  ) {
    this.scene = scene;
    this.id = id;
    this.optionId = optionId;
    this.player = player;
    this.speed = 1.5 * speedFactor;

    // 1. Crear el Mesh visual del enemigo (Caja tipo 'corrupted block')
    this.mesh = BABYLON.MeshBuilder.CreateBox(
      this.id,
      { width: 1.0, height: 1.5, depth: 1.0 },
      this.scene
    );
    this.mesh.position = spawnPoint.clone();
    
    // Habilitar colisiones para que no atraviese columnas
    this.mesh.checkCollisions = true;

    // 2. Aplicar Material de Estética Premium (Color neón según la opción)
    const enemyMat = new BABYLON.StandardMaterial(`enemyMat_${id}`, this.scene);
    
    // Asignar colores neón para identificar las opciones visualmente
    let glowColor = new BABYLON.Color3(0.9, 0.1, 0.3); // Rojo por defecto
    if (optionId === 'A') glowColor = new BABYLON.Color3(1.0, 0.3, 0.0); // Naranja
    if (optionId === 'B') glowColor = new BABYLON.Color3(0.0, 0.8, 1.0); // Celeste
    if (optionId === 'C') glowColor = new BABYLON.Color3(0.8, 0.1, 1.0); // Morado
    if (optionId === 'D') glowColor = new BABYLON.Color3(0.0, 0.9, 0.6); // Verde esmeralda

    enemyMat.diffuseColor = glowColor.scale(0.3);
    enemyMat.emissiveColor = glowColor.scale(0.5); // Brillo auto-iluminado
    enemyMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    
    this.mesh.material = enemyMat;

    // 3. Crear Etiqueta Flotante
    this.label = new FloatingLabel(this.scene, this.mesh, optionId);

    // 4. Registrar en el ciclo de actualización
    this.setupUpdateObserver();
  }

  private setupUpdateObserver(): void {
    this.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.update();
    });
  }

  private update(): void {
    if (!this.isAlive) return;

    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
    const playerCam = this.scene.activeCamera;
    if (!playerCam) return;

    // Posición del jugador en el plano
    const playerPos = playerCam.position.clone();
    
    // 1. Persecución: Moverse hacia el jugador manteniendo altura Y fija
    const toPlayer = playerPos.subtract(this.mesh.position);
    toPlayer.y = 0; // Solo en plano XZ

    const distance = toPlayer.length();

    if (distance > 0.1) {
      toPlayer.normalize();
      
      // Rotar enemigo para mirar hacia el jugador
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.mesh.rotation.y = targetAngle;

      // Calcular vector de movimiento
      const movement = toPlayer.scale(this.speed * deltaTime);

      // Mover el mesh con colisión nativa o desplazamiento directo
      this.mesh.position.addInPlace(movement);
    }

    // Asegurar altura constante (los enemigos no flotan ni se hunden)
    this.mesh.position.y = 1.25; // Mitad de su altura (1.5) + piso

    // 2. Colisión de Daño con el Jugador
    if (distance < this.damageRadius) {
      const now = performance.now();
      if (now - this.lastAttackTime > this.attackCooldownMs) {
        this.lastAttackTime = now;
        this.player.takeDamage(this.damage);
      }
    }
  }

  /**
   * Elimina al enemigo (llamado al ser disparado)
   */
  public kill(): void {
    if (!this.isAlive) return;
    this.isAlive = false;

    // Emitir evento de muerte
    this.onKilled.notifyObservers(this.optionId);

    // Efecto visual de desintegración rápido antes de dispose
    let scale = 1.0;
    const disintegrateObserver = this.scene.onBeforeRenderObservable.add(() => {
      scale -= 0.15;
      this.mesh.scaling = new BABYLON.Vector3(scale, scale, scale);
      if (scale <= 0) {
        this.scene.onBeforeRenderObservable.remove(disintegrateObserver);
        this.dispose();
      }
    });
  }

  public dispose(): void {
    this.isAlive = false;

    if (this.updateObserver) {
      this.scene.onBeforeRenderObservable.remove(this.updateObserver);
      this.updateObserver = null;
    }

    this.label.dispose();
    this.onKilled.clear();

    if (this.mesh.material) {
      this.mesh.material.dispose();
    }
    this.mesh.dispose();
  }
}
