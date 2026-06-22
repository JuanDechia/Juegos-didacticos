import * as BABYLON from '@babylonjs/core';
import { SubwayStationBuilder } from '../environment/SubwayStationBuilder';
import type { SubwayStationBuildResult } from '../environment/SubwayStationBuilder';
import { Lights } from '../environment/Lights';

export class SceneManager {
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private activeCamera: BABYLON.Camera | null = null;
  private mapResult: SubwayStationBuildResult | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    this.scene = new BABYLON.Scene(this.engine);
    this.setupDefaultScene();
    this.startRenderLoop();
  }

  private setupDefaultScene(): void {
    // 1. Crear el mapa
    this.mapResult = SubwayStationBuilder.build(this.scene);

    // 2. Configurar la iluminación
    Lights.setupMetroLights(this.scene);

    // 3. Configurar la cámara en el punto de Spawn del jugador
    const camera = new BABYLON.FreeCamera(
      'playerCamera',
      this.mapResult.playerSpawn,
      this.scene
    );
    // Mirar hacia el AnswerBoard (Z positivo)
    camera.setTarget(new BABYLON.Vector3(0, 2.0, 10));
    camera.attachControl(this.engine.getRenderingCanvas(), true);
    
    // Configuración de colisiones de la cámara para FPS
    camera.checkCollisions = true;
    camera.applyGravity = false; // Manejaremos la altura Y de forma fija por ahora, o colisiones nativas
    camera.ellipsoid = new BABYLON.Vector3(0.35, 0.9, 0.35); // Tamaño del jugador para colisiones (reducido para evitar trabas)
    camera.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0);
    camera.inertia = 0;

    this.activeCamera = camera;
  }

  public getMapResult(): SubwayStationBuildResult | null {
    return this.mapResult;
  }

  private startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      if (this.scene) {
        this.scene.render();
      }
    });
  }

  public getScene(): BABYLON.Scene {
    return this.scene;
  }

  public getEngine(): BABYLON.Engine {
    return this.engine;
  }

  public getActiveCamera(): BABYLON.Camera | null {
    return this.activeCamera;
  }

  public resize(): void {
    this.engine.resize();
  }

  public dispose(): void {
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }
}
