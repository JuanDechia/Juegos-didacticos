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
    },
    DynamicTexture: class {
      name: string;
      constructor(name: string) {
        this.name = name;
      }
      getContext() {
        return {
          fillStyle: '',
          fillRect: vi.fn(),
          strokeStyle: '',
          strokeRect: vi.fn(),
          font: '',
          textAlign: '',
          textBaseline: '',
          fillText: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          closePath: vi.fn(),
          fill: vi.fn(),
          lineWidth: 0,
        };
      }
      update() {}
    },
    MeshBuilder: {
      CreateBox: vi.fn((name) => createMockMesh(name)),
      CreateCylinder: vi.fn((name) => createMockMesh(name)),
      CreatePlane: vi.fn((name) => createMockMesh(name)),
    },
  };
});

import { RoomDecorator } from '../src/environment/RoomDecorator';
import type { RoomBounds } from '../src/environment/RoomDecorator';

describe('RoomDecorator', () => {
  let sceneMock: any;
  let materialsMock: any;
  let decorator: RoomDecorator;

  const mockBounds: RoomBounds = {
    min: new BABYLON.Vector3(-10, 0, -10),
    max: new BABYLON.Vector3(10, 5, 10),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sceneMock = new BABYLON.Scene();
    materialsMock = {
      floor: {},
      wall: {},
      column: {},
      platform: {},
      platformEdge: {},
      tracks: {},
      neonBlue: {},
      neonPurple: {},
      neonRed: {},
      neonGreen: {},
      brickClassic: {},
      brickDark: {},
      paintedBlue: {},
      paintedGreen: {},
      paintedOrange: {},
    };
    decorator = new RoomDecorator(sceneMock, materialsMock);
  });

  it('debe instanciarse correctamente', () => {
    expect(decorator).toBeDefined();
  });

  it('debe generar decoraciones para la habitación principal', () => {
    decorator.decorateMainRoom(mockBounds);

    // Debe crear letrero de estación, letrero de salida, marcas en el piso, weapon racks, base de columnas
    expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalled();
    expect(BABYLON.MeshBuilder.CreatePlane).toHaveBeenCalled();
  });

  it('debe generar decoraciones para la habitación izquierda', () => {
    decorator.decorateLeftRoom(mockBounds);

    // Debe crear tuberías (cylinders), crates (boxes), letrero
    expect(BABYLON.MeshBuilder.CreateCylinder).toHaveBeenCalled();
    expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalled();
  });

  it('debe generar decoraciones para la habitación derecha', () => {
    decorator.decorateRightRoom(mockBounds);

    // Debe crear tuberías bajas (cylinders), panel eléctrico (boxes), letrero (boxes), weapon rack (boxes)
    expect(BABYLON.MeshBuilder.CreateCylinder).toHaveBeenCalled();
    expect(BABYLON.MeshBuilder.CreateBox).toHaveBeenCalled();
  });
});
