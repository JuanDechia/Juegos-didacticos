import * as BABYLON from '@babylonjs/core';
import { inputs } from '../core/InputManager';
import { AudioSynth } from '../utils/AudioSynth';
import { weaponConfigs } from '../weapons/WeaponConfig';
import type { WeaponInventory } from '../weapons/WeaponInventory';
import type { HitZone } from '../enemies/ZombieAnimator';

export interface WeaponHitEvent {
  zombieId: string;
  hitZone: HitZone;
  damage: number;
}

/**
 * Controlador de disparo:
 * - Escucha mousedown/mouseup para soporte automático
 * - Realiza raycast(s) desde el centro de la pantalla
 * - Detecta hit zones vía mesh.metadata
 * - Delega ammo y cooldown a WeaponInventory
 */
export class WeaponController {
  private scene: BABYLON.Scene;
  private camera: BABYLON.Camera;
  private inventory: WeaponInventory;

  // Estadísticas de sesión
  private shotsFired = 0;
  private hits = 0;

  // Estado de disparo automático
  private mouseHeld = false;
  private autoFireInterval: ReturnType<typeof setInterval> | null = null;

  // Observables
  public onEnemyHit: BABYLON.Observable<WeaponHitEvent> = new BABYLON.Observable();
  public onShoot: BABYLON.Observable<void> = new BABYLON.Observable();

  // Listeners
  private onMouseDownBind: (e: MouseEvent) => void;
  private onMouseUpBind: (e: MouseEvent) => void;
  private keyObserver: BABYLON.Observer<BABYLON.KeyboardInfo> | null = null;

  constructor(scene: BABYLON.Scene, camera: BABYLON.Camera, inventory: WeaponInventory) {
    this.scene = scene;
    this.camera = camera;
    this.inventory = inventory;

    this.onMouseDownBind = (e) => this.handleMouseDown(e);
    this.onMouseUpBind = (e) => this.handleMouseUp(e);
    window.addEventListener('mousedown', this.onMouseDownBind);
    window.addEventListener('mouseup', this.onMouseUpBind);

    // Tecla R → recarga
    this.keyObserver = this.scene.onKeyboardObservable.add((kbInfo) => {
      if (
        kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN &&
        kbInfo.event.key.toLowerCase() === 'r'
      ) {
        this.inventory.tryReload();
      }
    });

    // Teclas 1-4 → cambio de arma
    this.scene.onKeyboardObservable.add((kbInfo) => {
      if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
        const keyMap: Record<string, string> = {
          '1': 'pistol',
          '2': 'shotgun',
          '3': 'subMachineGun',
          '4': 'machineGun',
        };
        const weaponId = keyMap[kbInfo.event.key];
        if (weaponId) {
          this.inventory.equipWeapon(weaponId as any);
        }
      }
    });
  }

  // ─── Input handlers ───────────────────────────────────────────────────────

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0 || !inputs.isLocked()) return;
    this.mouseHeld = true;

    const cfg = weaponConfigs[this.inventory.getCurrentWeaponId()];

    if (cfg.isAutomatic) {
      // Disparo inmediato + intervalo automático
      this.tryShoot();
      const fireDelay = 60000 / cfg.rpm;
      this.autoFireInterval = setInterval(() => {
        if (this.mouseHeld) this.tryShoot();
        else this.stopAutoFire();
      }, fireDelay);
    } else {
      this.tryShoot();
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.mouseHeld = false;
    this.stopAutoFire();
  }

  private stopAutoFire(): void {
    if (this.autoFireInterval !== null) {
      clearInterval(this.autoFireInterval);
      this.autoFireInterval = null;
    }
  }

  // ─── Disparo ──────────────────────────────────────────────────────────────

  private tryShoot(): void {
    if (!this.inventory.consumeShot()) return;

    this.shotsFired++;
    this.onShoot.notifyObservers();
    AudioSynth.playShoot();
    this.createMuzzleFlash();

    const cfg = weaponConfigs[this.inventory.getCurrentWeaponId()];
    const pellets = cfg.pellets ?? 1;

    for (let i = 0; i < pellets; i++) {
      this.fireRay(cfg.damage, pellets > 1);
    }
  }

  private fireRay(damage: number, isSpread: boolean): void {
    const ray = this.scene.createPickingRay(
      this.scene.getEngine().getRenderWidth() / 2,
      this.scene.getEngine().getRenderHeight() / 2,
      BABYLON.Matrix.Identity(),
      this.camera,
    );

    // Añadir spread para pellets
    if (isSpread) {
      ray.direction.addInPlace(new BABYLON.Vector3(
        (Math.random() - 0.5) * 0.12,
        (Math.random() - 0.5) * 0.12,
        0,
      ));
      ray.direction.normalize();
    }

    let targetPoint = ray.origin.add(ray.direction.scale(25));

    const hit = this.scene.pickWithRay(ray, (mesh) => {
      return mesh.metadata?.type === 'zombie_hitbox' && mesh.isEnabled();
    });

    if (hit && hit.hit && hit.pickedMesh) {
      this.hits++;
      targetPoint = hit.pickedPoint ?? targetPoint;

      const meta = hit.pickedMesh.metadata;
      const zombieId: string = meta?.zombieId ?? hit.pickedMesh.name;
      const hitZone: HitZone = meta?.hitZone ?? 'torso';

      this.onEnemyHit.notifyObservers({ zombieId, hitZone, damage });
    }

    this.createLaserBeam(ray.origin, targetPoint);
  }

  // ─── Efectos visuales ─────────────────────────────────────────────────────

  private createMuzzleFlash(): void {
    const flashPos = this.camera.position.add(
      this.camera.getForwardRay().direction.scale(1.0),
    );
    const flash = new BABYLON.PointLight('muzzleFlash', flashPos, this.scene);
    flash.diffuse = new BABYLON.Color3(0.0, 0.8, 1.0);
    flash.intensity = 1.5;
    flash.range = 8;
    setTimeout(() => flash.dispose(), 50);
  }

  private createLaserBeam(start: BABYLON.Vector3, end: BABYLON.Vector3): void {
    const forward = this.camera.getForwardRay().direction;
    const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up()).normalize();
    const weaponStart = start
      .add(forward.scale(0.8))
      .add(right.scale(0.25))
      .subtract(new BABYLON.Vector3(0, 0.25, 0));

    const laser = BABYLON.MeshBuilder.CreateLines('laserBeam', { points: [weaponStart, end] }, this.scene);
    laser.color = new BABYLON.Color3(0.0, 0.9, 1.0);

    let alpha = 1.0;
    const fadeObs = this.scene.onBeforeRenderObservable.add(() => {
      alpha -= 0.15;
      laser.alpha = alpha;
      if (alpha <= 0) {
        this.scene.onBeforeRenderObservable.remove(fadeObs);
        laser.dispose();
      }
    });
  }

  // ─── Stats de sesión ──────────────────────────────────────────────────────

  public getShotsFired(): number { return this.shotsFired; }
  public getHits(): number { return this.hits; }
  public getAccuracy(): number {
    return this.shotsFired === 0 ? 0 : (this.hits / this.shotsFired) * 100;
  }

  public reset(): void {
    this.shotsFired = 0;
    this.hits = 0;
    this.stopAutoFire();
    this.mouseHeld = false;
  }

  public dispose(): void {
    this.stopAutoFire();
    window.removeEventListener('mousedown', this.onMouseDownBind);
    window.removeEventListener('mouseup', this.onMouseUpBind);
    if (this.keyObserver) {
      this.scene.onKeyboardObservable.remove(this.keyObserver);
      this.keyObserver = null;
    }
    this.onEnemyHit.clear();
    this.onShoot.clear();
  }
}
