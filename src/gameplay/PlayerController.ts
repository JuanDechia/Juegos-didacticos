import * as BABYLON from '@babylonjs/core';
import { inputs } from '../core/InputManager';

export interface PlayerConfig {
  health: number;
  moveSpeed: number;
  sprintSpeed: number;
  lookSensitivity: number;
  height: number;
}

export class PlayerController {
  private camera: BABYLON.FreeCamera;
  private scene: BABYLON.Scene;
  private config: PlayerConfig;

  // Estado del jugador
  private health: number;
  private maxHealth: number;
  private isAlive = true;

  // Rotaciones acumuladas para evitar problemas de quaternion / gimbal lock
  private cameraYaw = 0;
  private cameraPitch = 0;
  
  // Guardado de posición y rotación iniciales
  private spawnPosition!: BABYLON.Vector3;
  private initialYaw = 0;
  private initialPitch = 0;

  private onBeforeRenderObserver: BABYLON.Observer<BABYLON.Scene> | null = null;
  public onDamageTaken: BABYLON.Observable<number> = new BABYLON.Observable();
  public onDeath: BABYLON.Observable<void> = new BABYLON.Observable();

  constructor(
    scene: BABYLON.Scene,
    camera: BABYLON.FreeCamera,
    config: Partial<PlayerConfig> = {}
  ) {
    this.scene = scene;
    this.camera = camera;

    // Configuración por defecto
    this.config = {
      health: config.health ?? 100,
      moveSpeed: config.moveSpeed ?? 5,
      sprintSpeed: config.sprintSpeed ?? 8,
      lookSensitivity: config.lookSensitivity ?? 0.002,
      height: config.height ?? 2.0,
    };

    this.health = this.config.health;
    this.maxHealth = this.config.health;

    // Colocar al jugador en su posición Y fija
    this.camera.position.y = this.config.height;

    // Obtener rotación inicial de la cámara
    this.cameraYaw = this.camera.rotation.y;
    this.cameraPitch = this.camera.rotation.x;
    
    // Guardar posición y rotación iniciales
    this.spawnPosition = this.camera.position.clone();
    this.initialYaw = this.cameraYaw;
    this.initialPitch = this.cameraPitch;

    // Desconectar el control por defecto de Babylon para que nosotros controlemos la cámara con precisión
    this.camera.detachControl();
    this.camera.inertia = 0;

    this.setupUpdateLoop();
  }

  private setupUpdateLoop(): void {
    this.onBeforeRenderObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.update();
    });
  }

  private update(): void {
    if (!this.isAlive || !inputs.isLocked()) {
      return;
    }

    const deltaTime = Math.min(
      this.scene.getEngine().getDeltaTime() / 1000,
      1 / 30
    );

    // 1. Manejo del Mouse (Mirar alrededor)
    const mouseDelta = inputs.consumeMouseDeltas();
    
    this.cameraYaw += mouseDelta.x * this.config.lookSensitivity;
    this.cameraPitch += mouseDelta.y * this.config.lookSensitivity;

    // Limitar el pitch (mirar arriba/abajo) a unos 85 grados
    const pitchLimit = Math.PI / 2.1;
    this.cameraPitch = Math.max(-pitchLimit, Math.min(pitchLimit, this.cameraPitch));

    // Aplicar rotación a la cámara
    this.camera.rotation.x = this.cameraPitch;
    this.camera.rotation.y = this.cameraYaw;

    // 2. Manejo del Teclado (Movimiento WASD)
    const isSprinting = inputs.isKeyPressed('shift');
    const currentSpeed = isSprinting ? this.config.sprintSpeed : this.config.moveSpeed;

    // Calcular dirección local
    const forwardDirection = new BABYLON.Vector3(
      Math.sin(this.cameraYaw),
      0, // Movimiento Y fijo en el plano
      Math.cos(this.cameraYaw)
    ).normalize();

    const rightDirection = new BABYLON.Vector3(
      forwardDirection.z,
      0,
      -forwardDirection.x
    ).normalize();

    const moveDirection = BABYLON.Vector3.Zero();

    if (inputs.isKeyPressed('w') || inputs.isKeyPressed('arrowup')) {
      moveDirection.addInPlace(forwardDirection);
    }
    if (inputs.isKeyPressed('s') || inputs.isKeyPressed('arrowdown')) {
      moveDirection.subtractInPlace(forwardDirection);
    }
    if (inputs.isKeyPressed('d') || inputs.isKeyPressed('arrowright')) {
      moveDirection.addInPlace(rightDirection);
    }
    if (inputs.isKeyPressed('a') || inputs.isKeyPressed('arrowleft')) {
      moveDirection.subtractInPlace(rightDirection);
    }

    if (moveDirection.length() > 0) {
      moveDirection.normalize().scaleInPlace(currentSpeed * deltaTime);
      
      // Intentar mover la cámara usando el sistema de colisiones nativo
      this.camera.cameraDirection.addInPlace(moveDirection);
    }

    // 3. Forzar altura Y constante y aplicar límites para evitar traspasar límites del mapa
    this.camera.position.y = this.config.height;

    // Límites comentados temporalmente para usar colisiones físicas e invisible blockers
    /*
    const limitX = 13.8;
    const limitZMax = 1.2;
    const limitZMin = -8.8;

    if (this.camera.position.x < -limitX) this.camera.position.x = -limitX;
    if (this.camera.position.x > limitX) this.camera.position.x = limitX;
    if (this.camera.position.z < limitZMin) this.camera.position.z = limitZMin;
    if (this.camera.position.z > limitZMax) this.camera.position.z = limitZMax;
    */
  }

  /**
   * Reduce la salud del jugador
   */
  public takeDamage(amount: number): void {
    if (!this.isAlive) return;

    this.health = Math.max(0, this.health - amount);
    this.onDamageTaken.notifyObservers(this.health);

    if (this.health <= 0) {
      this.isAlive = false;
      this.onDeath.notifyObservers();
    }
  }

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public reset(): void {
    this.health = this.maxHealth;
    this.isAlive = true;
    this.camera.position.copyFrom(this.spawnPosition);
    this.cameraYaw = this.initialYaw;
    this.cameraPitch = this.initialPitch;
    this.camera.rotation.x = this.cameraPitch;
    this.camera.rotation.y = this.cameraYaw;
  }

  public dispose(): void {
    if (this.onBeforeRenderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.onBeforeRenderObserver);
      this.onBeforeRenderObserver = null;
    }
    this.onDamageTaken.clear();
    this.onDeath.clear();
  }
}
