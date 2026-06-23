import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';

// Mockear Babylon.js para evitar ejecuciones WebGL reales
vi.mock('@babylonjs/core', () => {
  class MockVector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    clone() {
      return new MockVector3(this.x, this.y, this.z);
    }
    subtract(other: MockVector3) {
      return new MockVector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    normalize() {
      return this;
    }
    add(other: MockVector3) {
      return new MockVector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }
    scale(factor: number) {
      return new MockVector3(this.x * factor, this.y * factor, this.z * factor);
    }
    lengthSquared() {
      return 1;
    }
    static Distance() {
      return 10;
    }
    static Center(a: MockVector3, b: MockVector3) {
      return new MockVector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    }
    static Cross() {
      return new MockVector3(0, 1, 0);
    }
    static Dot() {
      return 0.5;
    }
  }

  const createMockMesh = (name: string) => ({
    name,
    position: new MockVector3(),
    rotation: new MockVector3(),
    rotationQuaternion: null,
    material: null,
    checkCollisions: false,
    isVisible: true,
    parent: null,
    clone: vi.fn((cloneName) => createMockMesh(cloneName)),
  });

  return {
    Vector3: MockVector3,
    Quaternion: {
      RotationAxis: vi.fn(() => ({})),
    },
    Color3: class {
      r: number; g: number; b: number;
      constructor(r = 0, g = 0, b = 0) {
        this.r = r;
        this.g = g;
        this.b = b;
      }
      static Black() {
        return new this(0, 0, 0);
      }
    },
    Scene: class {
      onBeforeRenderObservable = { add: vi.fn() };
      materials: any[] = [];
      getMaterialByName(name: string) {
        return this.materials.find(m => m.name === name) || null;
      }
    },
    StandardMaterial: class {
      name: string;
      diffuseColor: any;
      specularColor: any;
      emissiveColor: any;
      diffuseTexture: any;
      emissiveTexture: any;
      disableLighting: boolean = false;
      useAlphaFromDiffuseTexture: boolean = false;
      constructor(name: string) {
        this.name = name;
      }
      clone(name: string) {
        const c = new (this.constructor as any)(name);
        c.diffuseColor = this.diffuseColor;
        c.specularColor = this.specularColor;
        c.diffuseTexture = this.diffuseTexture ? { uScale: 1, vScale: 1 } : null;
        return c;
      }
    },
    MeshBuilder: {
      CreateBox: vi.fn((name) => createMockMesh(name)),
    },
    SpotLight: class {
      name: string;
      position: any;
      direction: any;
      angle: number;
      exponent: number;
      intensity: number = 1.0;
      range: number = 10;
      diffuse: any;
      specular: any;
      constructor(name: string, position: any, direction: any, angle: number, exponent: number, scene: any) {
        this.name = name;
        this.position = position;
        this.direction = direction;
        this.angle = angle;
        this.exponent = exponent;
      }
    }
  };
});

import { WindowBuilder } from '../src/environment/WindowBuilder';

describe('WindowBuilder', () => {
  let mockScene: any;
  let mockMaterial: any;

  beforeEach(() => {
    mockScene = new BABYLON.Scene();
    mockMaterial = new BABYLON.StandardMaterial('brick_test', mockScene);
    vi.clearAllMocks();
  });

  it('debería construir una ventana orientada en X y retornar un WindowEntryPoint válido', () => {
    const center = new BABYLON.Vector3(0, 3.5, -10.5);
    const outNormal = new BABYLON.Vector3(0, 0, -1);

    const entryPoint = WindowBuilder.build(
      mockScene,
      'test_window_x',
      center,
      15, // wallWidth
      7,  // wallHeight
      1,  // wallThickness
      'X',
      outNormal,
      2.2, // windowWidth
      3.5, // windowHeight
      1.0, // windowBottom
      mockMaterial
    );

    expect(entryPoint.id).toBe('test_window_x');
    expect(entryPoint.windowPosition.x).toBe(0);
    expect(entryPoint.windowPosition.y).toBe(1.0 + 3.5 / 2); // bottom + height / 2 = 2.75
    expect(entryPoint.windowPosition.z).toBe(-10.5);

    // Exterior Spawn: outNormal * 12
    expect(entryPoint.exteriorSpawnPosition.z).toBe(-10.5 - 12);
    // Approach: outNormal * 1.5
    expect(entryPoint.approachPosition.z).toBe(-10.5 - 1.5);
    // Climb Start: outNormal * 0.8
    expect(entryPoint.climbStartPosition.z).toBe(-10.5 - 0.8);
    // Climb End: inNormal * 0.8
    expect(entryPoint.climbEndPosition.z).toBe(-10.5 + 0.8);
    // Landing: inNormal * 2.0
    expect(entryPoint.insideLandingPosition.z).toBe(-10.5 + 2.0);

    // Debería haber creado varias cajas (paredes, marco)
    expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalled();
  });

  it('debería construir una ventana orientada en Z y retornar un WindowEntryPoint válido', () => {
    const center = new BABYLON.Vector3(-27.5, 3.5, 1.5);
    const outNormal = new BABYLON.Vector3(-1, 0, 0);

    const entryPoint = WindowBuilder.build(
      mockScene,
      'test_window_z',
      center,
      13, // wallWidth
      7,  // wallHeight
      1,  // wallThickness
      'Z',
      outNormal,
      3.0, // windowWidth
      4.0, // windowHeight
      1.0, // windowBottom
      mockMaterial
    );

    expect(entryPoint.id).toBe('test_window_z');
    expect(entryPoint.windowPosition.x).toBe(-27.5);
    expect(entryPoint.windowPosition.y).toBe(3.0); // 1.0 + 4.0 / 2
    expect(entryPoint.windowPosition.z).toBe(1.5);

    // Exterior Spawn: outNormal * 12
    expect(entryPoint.exteriorSpawnPosition.x).toBe(-27.5 - 12);
    // Approach: outNormal * 1.5
    expect(entryPoint.approachPosition.x).toBe(-27.5 - 1.5);
  });
});
