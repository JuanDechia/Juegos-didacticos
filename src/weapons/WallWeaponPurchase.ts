import * as BABYLON from '@babylonjs/core';
import type { WeaponId } from './WeaponTypes';
import { weaponConfigs } from './WeaponConfig';
import type { WeaponInventory } from './WeaponInventory';
import type { MoneyManager } from '../economy/MoneyManager';

export interface WallWeaponConfig {
  weaponId: WeaponId;
  position: BABYLON.Vector3;
  /** Rotación Y del panel en radianes */
  rotationY: number;
  interactionRadius: number;
}

export type PurchaseResult = 'purchased' | 'already_owned' | 'not_enough_money' | 'out_of_range';

/**
 * Panel de compra de arma en la pared.
 * Crea un panel visual simple y gestiona la interacción por proximidad (tecla E).
 */
export class WallWeaponPurchase {
  private scene: BABYLON.Scene;
  private config: WallWeaponConfig;
  private panelRoot: BABYLON.TransformNode;
  private labelTexture: BABYLON.DynamicTexture | null = null;
  private isPlayerNear = false;
  private purchased = false;

  /** Observable: emite cuando se compra el arma */
  public readonly onPurchased: BABYLON.Observable<WeaponId> = new BABYLON.Observable();

  constructor(scene: BABYLON.Scene, config: WallWeaponConfig) {
    this.scene = scene;
    this.config = config;

    this.panelRoot = new BABYLON.TransformNode(`wallWeapon_${config.weaponId}`, scene);
    this.panelRoot.position = config.position.clone();
    this.panelRoot.rotation.y = config.rotationY;

    this.buildPanel();
  }

  // ─── Construcción visual del panel ────────────────────────────────────────

  private buildPanel(): void {
    const cfg = weaponConfigs[this.config.weaponId];

    // Fondo del panel
    const bg = BABYLON.MeshBuilder.CreateBox(`wallWeapon_bg_${cfg.id}`, {
      width: 1.4, height: 1.8, depth: 0.08,
    }, this.scene);
    bg.parent = this.panelRoot;
    bg.position = new BABYLON.Vector3(0, 0, 0);

    const bgMat = new BABYLON.StandardMaterial(`wallWeapon_bgMat_${cfg.id}`, this.scene);
    bgMat.diffuseColor = new BABYLON.Color3(0.06, 0.06, 0.1);
    bgMat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.04);
    bg.material = bgMat;

    // Silueta del arma (una caja larga que simula el cañón + una más corta para el grip)
    this.buildWeaponSilhouette(cfg.id);

    // Plano de texto con DynamicTexture
    const textPlane = BABYLON.MeshBuilder.CreatePlane(`wallWeapon_text_${cfg.id}`, {
      width: 1.3, height: 0.7,
    }, this.scene);
    textPlane.parent = this.panelRoot;
    textPlane.position = new BABYLON.Vector3(0, -0.5, -0.06);

    const dt = new BABYLON.DynamicTexture(`wallWeapon_dt_${cfg.id}`, { width: 512, height: 256 }, this.scene);
    this.labelTexture = dt;
    this.updateLabel(false);

    const textMat = new BABYLON.StandardMaterial(`wallWeapon_textMat_${cfg.id}`, this.scene);
    textMat.diffuseTexture = dt;
    textMat.emissiveTexture = dt;
    textMat.backFaceCulling = false;
    textPlane.material = textMat;
  }

  private buildWeaponSilhouette(weaponId: string): void {
    const silColor = new BABYLON.Color3(0.05, 0.6, 0.8);

    const makePart = (name: string, w: number, h: number, d: number, pos: BABYLON.Vector3) => {
      const m = BABYLON.MeshBuilder.CreateBox(`wallSil_${weaponId}_${name}`, { width: w, height: h, depth: d }, this.scene);
      m.parent = this.panelRoot;
      m.position = pos;
      const mat = new BABYLON.StandardMaterial(`wallSilMat_${weaponId}_${name}`, this.scene);
      mat.diffuseColor = silColor.scale(0.2);
      mat.emissiveColor = silColor.scale(0.6);
      m.material = mat;
    };

    // Todas las armas tienen cañón + grip como silueta mínima
    makePart('barrel', 0.7, 0.09, 0.06, new BABYLON.Vector3(0.1, 0.15, -0.06));
    makePart('body',   0.35, 0.14, 0.06, new BABYLON.Vector3(-0.05, 0.12, -0.06));
    makePart('grip',   0.08, 0.18, 0.06, new BABYLON.Vector3(-0.2, -0.02, -0.06));

    if (weaponId === 'shotgun') {
      makePart('pump', 0.2, 0.08, 0.07, new BABYLON.Vector3(0.05, 0.09, -0.06));
    }
    if (weaponId === 'subMachineGun') {
      makePart('mag', 0.06, 0.22, 0.06, new BABYLON.Vector3(-0.06, -0.07, -0.06));
    }
    if (weaponId === 'machineGun') {
      makePart('mag', 0.06, 0.3, 0.06, new BABYLON.Vector3(0.0, -0.08, -0.06));
      makePart('bipod1', 0.04, 0.18, 0.04, new BABYLON.Vector3(0.18, -0.03, -0.06));
      makePart('bipod2', 0.04, 0.18, 0.04, new BABYLON.Vector3(0.28, -0.03, -0.06));
    }
  }

  private updateLabel(playerNear: boolean): void {
    if (!this.labelTexture) return;
    const cfg = weaponConfigs[this.config.weaponId];
    const ctx = this.labelTexture.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 512, 256);

    // Fondo semitransparente
    ctx.fillStyle = 'rgba(5, 10, 20, 0.85)';
    ctx.fillRect(0, 0, 512, 256);

    // Nombre del arma
    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`[ ${cfg.displayName.toUpperCase()} ]`, 256, 60);

    // Precio
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px Arial';
    ctx.fillText(`Price: $${cfg.price}`, 256, 120);

    // Prompt
    if (this.purchased) {
      ctx.fillStyle = '#00f5d4';
      ctx.font = 'bold 28px Arial';
      ctx.fillText('✓ Already owned', 256, 190);
    } else if (playerNear) {
      ctx.fillStyle = '#ffeb3b';
      ctx.font = 'bold 30px Arial';
      ctx.fillText('Press E to buy', 256, 190);
    } else {
      ctx.fillStyle = 'rgba(200,200,200,0.5)';
      ctx.font = '24px Arial';
      ctx.fillText('Approach to buy', 256, 190);
    }

    this.labelTexture.update();
  }

  // ─── Lógica de interacción ────────────────────────────────────────────────

  public update(playerPosition: BABYLON.Vector3): void {
    const dist = BABYLON.Vector3.Distance(playerPosition, this.config.position);
    const near = dist <= this.config.interactionRadius;

    if (near !== this.isPlayerNear) {
      this.isPlayerNear = near;
      this.updateLabel(near);
    }
  }

  public canInteract(playerPosition: BABYLON.Vector3): boolean {
    return this.isPlayerNear &&
      BABYLON.Vector3.Distance(playerPosition, this.config.position) <= this.config.interactionRadius;
  }

  public tryPurchase(inventory: WeaponInventory, money: MoneyManager): PurchaseResult {
    if (!this.isPlayerNear) return 'out_of_range';

    if (inventory.hasWeapon(this.config.weaponId)) {
      this.purchased = true;
      this.updateLabel(true);
      return 'already_owned';
    }

    const cfg = weaponConfigs[this.config.weaponId];
    if (!money.canAfford(cfg.price)) {
      return 'not_enough_money';
    }

    money.spendMoney(cfg.price, 'purchase');
    inventory.addWeapon(this.config.weaponId);
    inventory.equipWeapon(this.config.weaponId);
    this.purchased = true;
    this.updateLabel(true);
    this.onPurchased.notifyObservers(this.config.weaponId);
    return 'purchased';
  }

  public dispose(): void {
    this.onPurchased.clear();
    this.labelTexture?.dispose();
    this.panelRoot.getChildMeshes().forEach(m => {
      m.material?.dispose();
      m.dispose();
    });
    this.panelRoot.dispose();
  }
}
