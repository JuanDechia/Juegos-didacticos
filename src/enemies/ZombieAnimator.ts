import * as BABYLON from '@babylonjs/core';

/** Partes del cuerpo que pueden recibir impactos */
export type HitZone = 'head' | 'torso' | 'arm' | 'leg';

/** Multiplicadores de daño por zona */
export const HIT_ZONE_MULTIPLIERS: Record<HitZone, number> = {
  head: 3.0,
  torso: 1.0,
  arm: 0.75,
  leg: 0.75,
};

/**
 * Animador procedural de caminata para BoxZombie.
 * Solo rota/traslada bones — no usa assets externos.
 */
export class ZombieAnimator {
  private leftArm: BABYLON.Mesh;
  private rightArm: BABYLON.Mesh;
  private leftLeg: BABYLON.Mesh;
  private rightLeg: BABYLON.Mesh;
  private torso: BABYLON.Mesh;
  private head: BABYLON.Mesh;
  private baseHeadLocalY: number;
  private speedFactor: number;
  private active = true;

  constructor(
    leftArm: BABYLON.Mesh,
    rightArm: BABYLON.Mesh,
    leftLeg: BABYLON.Mesh,
    rightLeg: BABYLON.Mesh,
    torso: BABYLON.Mesh,
    head: BABYLON.Mesh,
    speedFactor = 1.0,
  ) {
    this.leftArm = leftArm;
    this.rightArm = rightArm;
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;
    this.torso = torso;
    this.head = head;
    this.baseHeadLocalY = head.position.y;
    this.speedFactor = speedFactor;
  }

  public update(): void {
    if (!this.active) return;
    const walkTime = performance.now() * 0.006 * this.speedFactor;
    const swing = Math.sin(walkTime) * 0.45;

    this.leftArm.rotation.x = swing;
    this.rightArm.rotation.x = -swing;
    this.leftLeg.rotation.x = -swing;
    this.rightLeg.rotation.x = swing;

    this.torso.rotation.z = Math.sin(walkTime * 0.5) * 0.04;
    this.head.position.y = this.baseHeadLocalY + Math.sin(walkTime * 2) * 0.025;
  }

  public stop(): void {
    this.active = false;
    // Volver a pose neutral
    this.leftArm.rotation.x = 0;
    this.rightArm.rotation.x = 0;
    this.leftLeg.rotation.x = 0;
    this.rightLeg.rotation.x = 0;
    this.torso.rotation.z = 0;
    this.head.position.y = this.baseHeadLocalY;
  }

  public setSpeedFactor(factor: number): void {
    this.speedFactor = factor;
  }
}
