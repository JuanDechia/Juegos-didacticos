// ─── Identificadores de armas ────────────────────────────────────────────────

export type WeaponId = 'pistol' | 'shotgun' | 'subMachineGun' | 'machineGun';

// ─── Configuración estática de cada arma ────────────────────────────────────

export interface WeaponConfig {
  id: WeaponId;
  displayName: string;
  price: number;
  damage: number;
  headMultiplier: number;
  rpm: number;
  magazineSize: number;
  reserveAmmo: number;
  reloadMs: number;
  isAutomatic: boolean;
  pellets?: number; // Shotgun
}

// ─── Estado dinámico de un arma en el inventario ─────────────────────────────

export interface WeaponState {
  weaponId: WeaponId;
  ammoInMagazine: number;
  reserveAmmo: number;
  isReloading: boolean;
  lastShotAtMs: number;
}

// ─── Tipo de recompensa por kill ─────────────────────────────────────────────

export type KillRewardType = 'standard' | 'one_shot_headshot';
