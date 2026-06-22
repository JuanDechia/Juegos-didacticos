import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mockear Babylon.js y `@babylonjs/gui` para que no ejecuten lógicas 3D en Node
vi.mock('@babylonjs/core', () => {
  return {
    Scene: vi.fn(() => ({
      onKeyboardObservable: { add: vi.fn(), remove: vi.fn() },
      onBeforeRenderObservable: { add: vi.fn(), remove: vi.fn() },
    })),
    FreeCamera: vi.fn(),
    Vector3: {
      Zero: vi.fn(() => ({ addInPlace: vi.fn(), normalize: vi.fn(), scaleInPlace: vi.fn() })),
    },
    Observable: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      notifyObservers: vi.fn(),
    })),
  };
});

vi.mock('@babylonjs/gui', () => ({
  AdvancedDynamicTexture: { CreateForMesh: vi.fn() },
  StackPanel: vi.fn(() => ({ addControl: vi.fn(), clearControls: vi.fn() })),
  TextBlock: vi.fn(),
  Rectangle: vi.fn(),
}));

// Mockear el JSON importado de geografía
vi.mock('../src/content/lessons/geography.france.json', () => ({
  default: {
    id: 'geo-france-capital-001',
    subject: 'Geografía',
    lessonId: 'geo-france-basic',
    prompt: '¿Cuál es la capital de Francia?',
    type: 'single_choice',
    options: [
      { id: 'A', enemyLabel: 'A', boardText: 'A - Berlín', fullText: 'Berlín' },
      { id: 'B', enemyLabel: 'B', boardText: 'B - París', fullText: 'París', isCorrect: true },
      { id: 'C', enemyLabel: 'C', boardText: 'C - Brasilia', fullText: 'Brasilia' },
      { id: 'D', enemyLabel: 'D', boardText: 'D - Roma', fullText: 'Roma' }
    ],
    explanation: 'París es la capital.',
    difficulty: 1
  }
}));

import { FpsEliminationMode } from '../src/gameplay/FpsEliminationMode';

describe('FpsEliminationMode (Estados de Juego)', () => {
  let sceneMock: any;
  let canvasMock: any;
  let playerMock: any;
  let weaponMock: any;
  let spawnerMock: any;
  let boardMock: any;
  let hudMock: any;

  beforeEach(() => {
    sceneMock = {};
    canvasMock = { requestPointerLock: vi.fn() };
    playerMock = { reset: vi.fn(), onDeath: { add: vi.fn(), remove: vi.fn() } };
    weaponMock = { reset: vi.fn(), getShotsFired: vi.fn(() => 0), getHits: vi.fn(() => 0), getAccuracy: vi.fn(() => 0) };
    spawnerMock = { dispose: vi.fn(), onEnemyKilled: { add: vi.fn(), remove: vi.fn() }, spawnOptions: vi.fn() };
    boardMock = { setQuestion: vi.fn(), markOptionEliminated: vi.fn(), showResult: vi.fn() };
    hudMock = { setVisible: vi.fn(), updateProgress: vi.fn(), updateObjective: vi.fn(), updateHealth: vi.fn() };
  });

  it('debe instanciarse correctamente sin lanzar excepciones', () => {
    const mode = new FpsEliminationMode(
      sceneMock,
      canvasMock,
      playerMock,
      weaponMock,
      spawnerMock,
      boardMock,
      hudMock
    );
    expect(mode).toBeDefined();
  });
});
