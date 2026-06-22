import * as BABYLON from '@babylonjs/core';
import { weaponConfigs } from './WeaponConfig';
import type { WeaponId, WeaponState } from './WeaponTypes';

export interface WeaponSwitchEvent {
  weaponId: WeaponId;
  displayName: string;
  ammoInMagazine: number;
  reserveAmmo: number;
}

/**
 * Gestiona el inventario de armas del jugador:
 * - Armas poseídas
 * - Estado de munición por arma (magazine + reserve)
 * - Recarga con delay
 * - Cambio de arma
 */
export class WeaponInventory {
  private ownedWeapons: WeaponId[] = [];
  private currentWeaponId: WeaponId = 'pistol';
  private weaponStates: Map<WeaponId, WeaponState> = new Map();
  private reloadTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Emite cuando cambia el arma activa o su ammo. */
  public readonly onWeaponChanged: BABYLON.Observable<WeaponSwitchEvent> = new BABYLON.Observable();
  /** Emite cuando empieza/termina la recarga. */
  public readonly onReloadStateChanged: BABYLON.Observable<boolean> = new BABYLON.Observable();

  constructor() {
    // El jugador siempre empieza con la pistola
    this.addWeapon('pistol');
  }

  // ─── Inventario ───────────────────────────────────────────────────────────

  public addWeapon(id: WeaponId): void {
    if (this.ownedWeapons.includes(id)) return;

    const cfg = weaponConfigs[id];
    this.ownedWeapons.push(id);
    this.weaponStates.set(id, {
      weaponId: id,
      ammoInMagazine: cfg.magazineSize,
      reserveAmmo: cfg.reserveAmmo,
      isReloading: false,
      lastShotAtMs: 0,
    });

    // Si es la primera arma, equiparla automáticamente
    if (this.ownedWeapons.length === 1) {
      this.equipWeapon(id);
    }
  }

  public hasWeapon(id: WeaponId): boolean {
    return this.ownedWeapons.includes(id);
  }

  public getOwnedWeapons(): WeaponId[] {
    return [...this.ownedWeapons];
  }

  // ─── Arma activa ──────────────────────────────────────────────────────────

  public equipWeapon(id: WeaponId): boolean {
    if (!this.hasWeapon(id)) return false;
    if (this.currentWeaponId === id) return true;

    // Cancelar recarga del arma anterior
    this.cancelReload();

    this.currentWeaponId = id;
    this.notifyWeaponChange();
    return true;
  }

  public getCurrentWeaponId(): WeaponId {
    return this.currentWeaponId;
  }

  public getCurrentState(): WeaponState {
    return this.weaponStates.get(this.currentWeaponId)!;
  }

  // ─── Disparo ──────────────────────────────────────────────────────────────

  /**
   * Intenta consumir una bala del cargador.
   * @returns true si había ammo y el cooldown pasó, false si no.
   */
  public canShoot(): boolean {
    const state = this.getCurrentState();
    const cfg = weaponConfigs[this.currentWeaponId];
    const fireDelay = 60000 / cfg.rpm;
    const now = performance.now();

    if (state.isReloading) return false;
    if (state.ammoInMagazine <= 0) return false;
    if (now - state.lastShotAtMs < fireDelay) return false;

    return true;
  }

  public consumeShot(): boolean {
    if (!this.canShoot()) return false;
    const state = this.getCurrentState();
    state.ammoInMagazine--;
    state.lastShotAtMs = performance.now();
    this.notifyWeaponChange();
    return true;
  }

  // ─── Recarga ──────────────────────────────────────────────────────────────

  public tryReload(): boolean {
    const state = this.getCurrentState();
    const cfg = weaponConfigs[this.currentWeaponId];

    if (state.isReloading) return false;
    if (state.ammoInMagazine >= cfg.magazineSize) return false;
    if (state.reserveAmmo <= 0) return false;

    state.isReloading = true;
    this.onReloadStateChanged.notifyObservers(true);

    this.reloadTimeoutId = setTimeout(() => {
      const needed = cfg.magazineSize - state.ammoInMagazine;
      const toLoad = Math.min(needed, state.reserveAmmo);
      state.ammoInMagazine += toLoad;
      state.reserveAmmo -= toLoad;
      state.isReloading = false;
      this.onReloadStateChanged.notifyObservers(false);
      this.notifyWeaponChange();
      this.reloadTimeoutId = null;
    }, cfg.reloadMs);

    return true;
  }

  private cancelReload(): void {
    if (this.reloadTimeoutId !== null) {
      clearTimeout(this.reloadTimeoutId);
      this.reloadTimeoutId = null;
      const state = this.getCurrentState();
      state.isReloading = false;
      this.onReloadStateChanged.notifyObservers(false);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private notifyWeaponChange(): void {
    const state = this.getCurrentState();
    const cfg = weaponConfigs[this.currentWeaponId];
    this.onWeaponChanged.notifyObservers({
      weaponId: this.currentWeaponId,
      displayName: cfg.displayName,
      ammoInMagazine: state.ammoInMagazine,
      reserveAmmo: state.reserveAmmo,
    });
  }

  public reset(): void {
    this.cancelReload();
    this.ownedWeapons = [];
    this.weaponStates.clear();
    this.addWeapon('pistol');
  }

  public dispose(): void {
    this.cancelReload();
    this.onWeaponChanged.clear();
    this.onReloadStateChanged.clear();
  }
}
