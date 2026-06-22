import type { WeaponConfig, WeaponId } from './WeaponTypes';

/**
 * Estadísticas fijas de cada arma.
 * Las referencias son de Plan-2.md sección 10.3.
 */
export const weaponConfigs: Record<WeaponId, WeaponConfig> = {
  pistol: {
    id: 'pistol',
    displayName: 'Pistol',
    price: 0,
    damage: 34,
    headMultiplier: 3.0,
    rpm: 240,
    magazineSize: 12,
    reserveAmmo: 48,
    reloadMs: 1200,
    isAutomatic: false,
  },

  shotgun: {
    id: 'shotgun',
    displayName: 'Shotgun',
    price: 150,
    damage: 18,
    headMultiplier: 2.0,
    rpm: 70,
    magazineSize: 6,
    reserveAmmo: 24,
    reloadMs: 2200,
    isAutomatic: false,
    pellets: 6,
  },

  subMachineGun: {
    id: 'subMachineGun',
    displayName: 'Sub-Machine Gun',
    price: 250,
    damage: 18,
    headMultiplier: 2.5,
    rpm: 650,
    magazineSize: 30,
    reserveAmmo: 120,
    reloadMs: 1700,
    isAutomatic: true,
  },

  machineGun: {
    id: 'machineGun',
    displayName: 'Machine Gun',
    price: 500,
    damage: 26,
    headMultiplier: 2.2,
    rpm: 550,
    magazineSize: 60,
    reserveAmmo: 180,
    reloadMs: 2800,
    isAutomatic: true,
  },
};

/** Calcula el delay entre disparos en milisegundos a partir del RPM. */
export function getFireDelayMs(rpm: number): number {
  return 60000 / rpm;
}
