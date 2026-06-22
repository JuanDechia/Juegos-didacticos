import * as BABYLON from '@babylonjs/core';
import { FloatingLabel } from '../ui3d/FloatingLabel';
import type { PlayerController } from '../gameplay/PlayerController';
import { ZombieAnimator, HIT_ZONE_MULTIPLIERS } from './ZombieAnimator';
import type { HitZone } from './ZombieAnimator';

export interface BoxZombieKillData {
  optionId: string;
  hitZone: HitZone;
  wasOneShotHeadshot: boolean;
}

export interface BoxZombieInstance {
  id: string;
  optionId: string;
  root: BABYLON.TransformNode;
  isAlive: boolean;
  health: number;
  takeDamage(damage: number, hitZone: HitZone): void;
  kill(): void;
  dispose(): void;
  onKilled: BABYLON.Observable<BoxZombieKillData>;
}

/**
 * Zombie humanoide compuesto por 6 boxes:
 *   root (TransformNode) → torso → head, leftArm, rightArm, leftLeg, rightLeg
 *
 * Cada mesh tiene metadata con { type, zombieId, hitZone } para raycast.
 */
export class BoxZombie implements BoxZombieInstance {
  public id: string;
  public optionId: string;
  public root: BABYLON.TransformNode;
  public isAlive = true;
  public health: number;
  private maxHealth: number;

  private scene: BABYLON.Scene;
  private player: PlayerController;

  // Meshes del cuerpo
  private torsoMesh!: BABYLON.Mesh;
  private headMesh!: BABYLON.Mesh;
  private leftArmMesh!: BABYLON.Mesh;
  private rightArmMesh!: BABYLON.Mesh;
  private leftLegMesh!: BABYLON.Mesh;
  private rightLegMesh!: BABYLON.Mesh;
  private allMeshes: BABYLON.Mesh[] = [];

  // Sistemas
  private animator!: ZombieAnimator;
  private label!: FloatingLabel;

  // Gameplay
  private speed: number;
  private damage: number;
  private damageRadius = 1.5;
  private lastAttackTime = 0;
  private attackCooldownMs = 1200;

  // Update observer
  private updateObserver: BABYLON.Observer<BABYLON.Scene> | null = null;

  // Eventos
  public onKilled: BABYLON.Observable<BoxZombieKillData> = new BABYLON.Observable();

  constructor(
    scene: BABYLON.Scene,
    id: string,
    optionId: string,
    spawnPoint: BABYLON.Vector3,
    player: PlayerController,
    health = 100,
    speed = 1.2,
    damage = 10,
  ) {
    this.scene = scene;
    this.id = id;
    this.optionId = optionId;
    this.player = player;
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.damage = damage;

    this.root = new BABYLON.TransformNode(id, scene);
    this.root.position = spawnPoint.clone();

    this.buildBody(optionId);
    this.setupAnimator();
    this.setupLabel();
    this.setupUpdateObserver();
  }

  // ─── Construcción del cuerpo ───────────────────────────────────────────────

  private buildBody(optionId: string): void {
    const color = this.getColorForOption(optionId);

    // Torso (raíz visual)
    this.torsoMesh = this.createPart('torso', 0.7, 1.0, 0.35, new BABYLON.Vector3(0, 0, 0), color, 'torso');
    this.torsoMesh.parent = this.root;

    // Cabeza
    this.headMesh = this.createPart('head', 0.45, 0.45, 0.45, new BABYLON.Vector3(0, 0.72, 0), color.scale(1.2), 'head');
    this.headMesh.parent = this.torsoMesh;

    // Brazo izquierdo
    this.leftArmMesh = this.createPart('leftArm', 0.2, 0.8, 0.2, new BABYLON.Vector3(-0.45, 0.1, 0), color, 'arm');
    this.leftArmMesh.parent = this.torsoMesh;

    // Brazo derecho
    this.rightArmMesh = this.createPart('rightArm', 0.2, 0.8, 0.2, new BABYLON.Vector3(0.45, 0.1, 0), color, 'arm');
    this.rightArmMesh.parent = this.torsoMesh;

    // Pierna izquierda
    this.leftLegMesh = this.createPart('leftLeg', 0.25, 0.8, 0.25, new BABYLON.Vector3(-0.22, -0.9, 0), color, 'leg');
    this.leftLegMesh.parent = this.torsoMesh;

    // Pierna derecha
    this.rightLegMesh = this.createPart('rightLeg', 0.25, 0.8, 0.25, new BABYLON.Vector3(0.22, -0.9, 0), color, 'leg');
    this.rightLegMesh.parent = this.torsoMesh;

    this.allMeshes = [
      this.torsoMesh, this.headMesh,
      this.leftArmMesh, this.rightArmMesh,
      this.leftLegMesh, this.rightLegMesh,
    ];
  }

  private createPart(
    partName: string,
    w: number, h: number, d: number,
    localPos: BABYLON.Vector3,
    color: BABYLON.Color3,
    hitZone: HitZone,
  ): BABYLON.Mesh {
    const meshName = `${this.id}_${partName}`;
    const mesh = BABYLON.MeshBuilder.CreateBox(meshName, { width: w, height: h, depth: d }, this.scene);
    mesh.position = localPos.clone();

    const mat = new BABYLON.StandardMaterial(`${meshName}_mat`, this.scene);
    mat.diffuseColor = color.scale(0.3);
    mat.emissiveColor = color.scale(0.5);
    mat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    mesh.material = mat;

    // Metadata de hit zone para raycast
    mesh.metadata = {
      type: 'zombie_hitbox',
      zombieId: this.id,
      hitZone,
    };

    mesh.checkCollisions = false;
    return mesh;
  }

  private getColorForOption(optionId: string): BABYLON.Color3 {
    switch (optionId) {
      case 'A': return new BABYLON.Color3(1.0, 0.3, 0.0);   // Naranja
      case 'B': return new BABYLON.Color3(0.0, 0.8, 1.0);   // Celeste
      case 'C': return new BABYLON.Color3(0.8, 0.1, 1.0);   // Morado
      case 'D': return new BABYLON.Color3(0.0, 0.9, 0.6);   // Verde esmeralda
      default:  return new BABYLON.Color3(0.9, 0.1, 0.3);   // Rojo
    }
  }

  // ─── Animación y label ─────────────────────────────────────────────────────

  private setupAnimator(): void {
    this.animator = new ZombieAnimator(
      this.leftArmMesh, this.rightArmMesh,
      this.leftLegMesh, this.rightLegMesh,
      this.torsoMesh, this.headMesh,
      this.speed / 1.2, // normalizar respecto a base speed
    );
  }

  private setupLabel(): void {
    // El label flota sobre la cabeza
    this.label = new FloatingLabel(this.scene, this.headMesh, this.optionId);
  }

  // ─── Loop de actualización ─────────────────────────────────────────────────

  private setupUpdateObserver(): void {
    this.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.update();
    });
  }

  private update(): void {
    if (!this.isAlive) return;

    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
    const camera = this.scene.activeCamera;
    if (!camera) return;

    // Persecución del jugador en plano XZ
    const playerPos = camera.position.clone();
    const toPlayer = playerPos.subtract(this.root.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();

    if (distance > 0.1) {
      toPlayer.normalize();
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.root.rotation.y = targetAngle;
      this.root.position.addInPlace(toPlayer.scale(this.speed * deltaTime));
    }

    // Mantener altura: la raíz está al nivel del suelo, el torso centrado en Y=0
    this.root.position.y = 0;
    // El torso está offset arriba para que las piernas queden al ras del suelo
    this.torsoMesh.position.y = 1.4;

    // Animación procedural
    this.animator.update();

    // Daño al jugador por contacto
    if (distance < this.damageRadius) {
      const now = performance.now();
      if (now - this.lastAttackTime > this.attackCooldownMs) {
        this.lastAttackTime = now;
        this.player.takeDamage(this.damage);
      }
    }
  }

  // ─── Sistema de daño ──────────────────────────────────────────────────────

  public takeDamage(baseDamage: number, hitZone: HitZone): void {
    if (!this.isAlive) return;

    const multiplier = HIT_ZONE_MULTIPLIERS[hitZone];
    const finalDamage = baseDamage * multiplier;

    const wasFullHealth = this.health >= this.maxHealth;
    this.health = Math.max(0, this.health - finalDamage);

    if (this.health <= 0) {
      const wasOneShotHeadshot = wasFullHealth && hitZone === 'head';
      this.killWithData({ optionId: this.optionId, hitZone, wasOneShotHeadshot });
    }
  }

  public kill(): void {
    // Kill directo sin datos de hit zone (compatibilidad)
    this.killWithData({ optionId: this.optionId, hitZone: 'torso', wasOneShotHeadshot: false });
  }

  private killWithData(data: BoxZombieKillData): void {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.animator.stop();

    this.onKilled.notifyObservers(data);

    // Efecto de desintegración
    let scale = 1.0;
    const disintegrateObserver = this.scene.onBeforeRenderObservable.add(() => {
      scale -= 0.12;
      const sv = new BABYLON.Vector3(scale, scale, scale);
      this.allMeshes.forEach(m => { m.scaling = sv; });
      if (scale <= 0) {
        this.scene.onBeforeRenderObservable.remove(disintegrateObserver);
        this.dispose();
      }
    });
  }

  // ─── Dispose ───────────────────────────────────────────────────────────────

  public dispose(): void {
    this.isAlive = false;

    if (this.updateObserver) {
      this.scene.onBeforeRenderObservable.remove(this.updateObserver);
      this.updateObserver = null;
    }

    this.label.dispose();
    this.onKilled.clear();

    this.allMeshes.forEach(m => {
      m.material?.dispose();
      m.dispose();
    });
    this.root.dispose();
  }
}
