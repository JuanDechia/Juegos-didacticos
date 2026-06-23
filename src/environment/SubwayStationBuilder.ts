import * as BABYLON from '@babylonjs/core';
import { Materials } from './Materials';
import { RoomDecorator } from './RoomDecorator';
import type { RoomBounds } from './RoomDecorator';
import { WindowBuilder } from './WindowBuilder';
import type { WindowEntryPoint } from './WindowBuilder';

export interface WallWeaponAnchor {
  position: BABYLON.Vector3;
  rotationY: number;
  weaponId: string;
}

export interface SubwayStationBuildResult {
  playerSpawn: BABYLON.Vector3;
  enemySpawns: BABYLON.Vector3[];
  answerBoardAnchor: BABYLON.AbstractMesh;
  wallWeaponAnchors: WallWeaponAnchor[];
  windowEntryPoints: WindowEntryPoint[];
  roomBounds: {
    main: RoomBounds;
    left: RoomBounds;
    right: RoomBounds;
  };
}

/**
 * Construye el mapa de la estación de metro con 3 habitaciones:
 *  - Habitación principal (arena + answer wall)
 *  - Habitación lateral izquierda (puerta grande, zona abierta)
 *  - Habitación lateral derecha (puerta pequeña, pasillo)
 */
export class SubwayStationBuilder {
  public static build(scene: BABYLON.Scene): SubwayStationBuildResult {
    const mats = Materials.createMetroMaterials(scene);
    scene.collisionsEnabled = true;

    // ─── HABITACIÓN PRINCIPAL ────────────────────────────────────────────────
    // Dimensiones: X [-15, 15], Z [-10, 10]

    const windowEntryPoints: WindowEntryPoint[] = [];

    // Piso principal
    SubwayStationBuilder.makeBox(scene, 'floor_main', 30, 0.5, 20, new BABYLON.Vector3(0, -0.25, 0), mats.platform, false);

    // Pared trasera (Z = -10) con dos ventanas
    const windowMainLeft = WindowBuilder.build(
      scene,
      'window_main_left',
      new BABYLON.Vector3(-7.5, 3.5, -10.5),
      15, // wallWidth
      7,  // wallHeight
      1,  // wallThickness
      'X',
      new BABYLON.Vector3(0, 0, -1), // outNormal
      2.2, // windowWidth
      3.5, // windowHeight
      1.0, // windowBottom
      mats.brickClassic
    );
    windowEntryPoints.push(windowMainLeft);

    const windowMainRight = WindowBuilder.build(
      scene,
      'window_main_right',
      new BABYLON.Vector3(7.5, 3.5, -10.5),
      15, // wallWidth
      7,  // wallHeight
      1,  // wallThickness
      'X',
      new BABYLON.Vector3(0, 0, -1), // outNormal
      2.2, // windowWidth
      3.5, // windowHeight
      1.0, // windowBottom
      mats.brickClassic
    );
    windowEntryPoints.push(windowMainRight);

    // Pared frontal (Z = 10) — con el AnswerBoard
    SubwayStationBuilder.makeBox(scene, 'wall_front', 30, 7, 1, new BABYLON.Vector3(0, 3.5, 10.5), mats.paintedBlue, true);

    // Techo principal
    SubwayStationBuilder.makeBox(scene, 'ceiling_main', 30, 0.5, 20, new BABYLON.Vector3(0, 7, 0), mats.wall, false);

    // Columnas de soporte en habitación principal
    const mainColPositions = [
      new BABYLON.Vector3(-9, 3.5, -3),
      new BABYLON.Vector3(-3, 3.5, -3),
      new BABYLON.Vector3(3, 3.5, -3),
      new BABYLON.Vector3(9, 3.5, -3),
    ];
    mainColPositions.forEach((pos, i) => {
      SubwayStationBuilder.makeBox(scene, `col_main_vis_${i}`, 0.8, 7, 0.8, pos, mats.column, false);
      SubwayStationBuilder.makeBox(scene, `col_main_col_${i}`, 0.55, 7, 0.55, pos, mats.column, true, false);
    });

    // ─── PARED IZQUIERDA — con apertura para habitación lateral izquierda ───
    // La apertura (puerta grande) está en Z: [-2, 5], Y: [0, 5] (4 unidades de ancho)
    // Segmento superior: Z de -10 a 10, excepto la apertura
    // Segmento trasero Z [-10, -2]
    SubwayStationBuilder.makeBox(scene, 'wall_left_back', 1, 7, 8, new BABYLON.Vector3(-15.5, 3.5, -6), mats.paintedBlue, true);
    // Segmento frontal Z [5, 10]
    SubwayStationBuilder.makeBox(scene, 'wall_left_front', 1, 7, 5, new BABYLON.Vector3(-15.5, 3.5, 7.5), mats.paintedBlue, true);
    // Dintel sobre la puerta grande
    SubwayStationBuilder.makeBox(scene, 'wall_left_lintel', 1, 2, 7, new BABYLON.Vector3(-15.5, 6, 1.5), mats.paintedBlue, true);

    // ─── PARED DERECHA — con apertura para habitación lateral derecha ────────
    // Puerta pequeña: Z: [2, 6], más estrecha
    SubwayStationBuilder.makeBox(scene, 'wall_right_back', 1, 7, 12, new BABYLON.Vector3(15.5, 3.5, -4), mats.paintedBlue, true);
    SubwayStationBuilder.makeBox(scene, 'wall_right_front', 1, 7, 4, new BABYLON.Vector3(15.5, 3.5, 8), mats.paintedBlue, true);
    SubwayStationBuilder.makeBox(scene, 'wall_right_lintel', 1, 2.5, 4, new BABYLON.Vector3(15.5, 5.75, 4), mats.paintedBlue, true);

    // ─── HABITACIÓN LATERAL IZQUIERDA ────────────────────────────────────────
    // Posición: X [-27, -15], Z [-5, 8], relativa al centro del mapa
    SubwayStationBuilder.makeBox(scene, 'floor_left', 12, 0.5, 13, new BABYLON.Vector3(-21, -0.25, 1.5), mats.platform, false);
    SubwayStationBuilder.makeBox(scene, 'ceiling_left', 12, 0.5, 13, new BABYLON.Vector3(-21, 7, 1.5), mats.wall, false);
    
    const windowLeftOuter = WindowBuilder.build(
      scene,
      'window_left_room',
      new BABYLON.Vector3(-27.5, 3.5, 1.5),
      13, // wallWidth
      7,  // wallHeight
      1,  // wallThickness
      'Z',
      new BABYLON.Vector3(-1, 0, 0), // outNormal
      3.0, // windowWidth
      4.0, // windowHeight
      1.0, // windowBottom
      mats.paintedGreen
    );
    windowEntryPoints.push(windowLeftOuter);

    SubwayStationBuilder.makeBox(scene, 'wall_left_top', 12, 7, 1, new BABYLON.Vector3(-21, 3.5, -5.5), mats.paintedGreen, true);
    SubwayStationBuilder.makeBox(scene, 'wall_left_bot', 12, 7, 1, new BABYLON.Vector3(-21, 3.5, 8.5), mats.paintedGreen, true);

    // ─── HABITACIÓN LATERAL DERECHA (pasillo estrecho) ───────────────────────
    // Posición: X [15, 25], Z [1, 8]
    SubwayStationBuilder.makeBox(scene, 'floor_right', 10, 0.5, 7, new BABYLON.Vector3(20, -0.25, 4.5), mats.platform, false);
    SubwayStationBuilder.makeBox(scene, 'ceiling_right', 10, 0.5, 7, new BABYLON.Vector3(20, 7, 4.5), mats.wall, false);
    
    const windowRightOuter = WindowBuilder.build(
      scene,
      'window_right_room',
      new BABYLON.Vector3(25.5, 3.5, 4.5),
      7,  // wallWidth
      7,  // wallHeight
      1,  // wallThickness
      'Z',
      new BABYLON.Vector3(1, 0, 0), // outNormal
      1.8, // windowWidth
      3.0, // windowHeight
      1.2, // windowBottom
      mats.paintedOrange
    );
    windowEntryPoints.push(windowRightOuter);

    SubwayStationBuilder.makeBox(scene, 'wall_right_top', 10, 7, 1, new BABYLON.Vector3(20, 3.5, 1), mats.brickDark, true);
    SubwayStationBuilder.makeBox(scene, 'wall_right_bot', 10, 7, 1, new BABYLON.Vector3(20, 3.5, 8.5), mats.brickDark, true);

    // ─── ANSWER BOARD ANCHOR ─────────────────────────────────────────────────
    const boardAnchor = BABYLON.MeshBuilder.CreateBox('answerBoardAnchor', { width: 14, height: 4, depth: 0.1 }, scene);
    boardAnchor.position = new BABYLON.Vector3(0, 3.5, 9.9);
    const boardBgMat = new BABYLON.StandardMaterial('boardBgMat', scene);
    boardBgMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.08);
    boardBgMat.emissiveColor = new BABYLON.Color3(0.01, 0.01, 0.02);
    boardAnchor.material = boardBgMat;

    // ─── SPAWN POINTS ────────────────────────────────────────────────────────

    const playerSpawn = new BABYLON.Vector3(0, 1.8, -7);

    // Spawns en habitación principal
    const enemySpawns: BABYLON.Vector3[] = [
      new BABYLON.Vector3(-9, 0, 5),
      new BABYLON.Vector3(-3, 0, 7),
      new BABYLON.Vector3(3, 0, 7),
      new BABYLON.Vector3(9, 0, 5),
      // Habitación izquierda
      new BABYLON.Vector3(-20, 0, -2),
      new BABYLON.Vector3(-24, 0, 4),
      // Habitación derecha
      new BABYLON.Vector3(19, 0, 3),
      new BABYLON.Vector3(22, 0, 6),
    ];

    // ─── WALL WEAPON ANCHORS ─────────────────────────────────────────────────
    const wallWeaponAnchors: WallWeaponAnchor[] = [
      // Shotgun en pared trasera (izquierda de la habitación principal)
      {
        weaponId: 'shotgun',
        position: new BABYLON.Vector3(-8, 2.0, -9.8),
        rotationY: Math.PI,
      },
      // SMG en pared trasera (derecha de la habitación principal)
      {
        weaponId: 'subMachineGun',
        position: new BABYLON.Vector3(8, 2.0, -9.8),
        rotationY: Math.PI,
      },
      // Machine gun en habitación lateral derecha (fomenta exploración)
      {
        weaponId: 'machineGun',
        position: new BABYLON.Vector3(24.8, 2.0, 4.5),
        rotationY: Math.PI / 2,
      },
    ];

    const mainBounds: RoomBounds = {
      min: new BABYLON.Vector3(-15, 0, -10),
      max: new BABYLON.Vector3(15, 7, 10),
    };
    const leftBounds: RoomBounds = {
      min: new BABYLON.Vector3(-27, 0, -5),
      max: new BABYLON.Vector3(-15, 7, 8),
    };
    const rightBounds: RoomBounds = {
      min: new BABYLON.Vector3(15, 0, 1),
      max: new BABYLON.Vector3(25, 7, 8),
    };

    const decorator = new RoomDecorator(scene, mats);
    decorator.decorateMainRoom(mainBounds);
    decorator.decorateLeftRoom(leftBounds);
    decorator.decorateRightRoom(rightBounds);

    return {
      playerSpawn,
      enemySpawns,
      answerBoardAnchor: boardAnchor,
      wallWeaponAnchors,
      windowEntryPoints,
      roomBounds: {
        main: mainBounds,
        left: leftBounds,
        right: rightBounds,
      },
    };
  }

  /** Crea un box con colisión opcional y visibilidad opcional */
  private static makeBox(
    scene: BABYLON.Scene,
    name: string,
    w: number, h: number, d: number,
    pos: BABYLON.Vector3,
    mat: BABYLON.Material,
    collision = true,
    visible = true,
  ): BABYLON.Mesh {
    const box = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    box.position = pos.clone();

    let finalMat = mat;
    // Si es un material de ladrillos procedimental, clonamos y ajustamos el tiling según las dimensiones de la pared
    if (mat instanceof BABYLON.StandardMaterial && mat.name.indexOf('brick') !== -1 && mat.diffuseTexture) {
      const clonedMat = mat.clone(name + '_brick_cloned');
      const diffTex = clonedMat.diffuseTexture as BABYLON.Texture;

      const wallWidth = Math.max(w, d);
      const wallHeight = h;

      // Proporciones físicas de los ladrillos aproximadas a 0.8 de ancho y 0.3 de alto
      diffTex.uScale = wallWidth / 0.8;
      diffTex.vScale = wallHeight / 0.3;
      finalMat = clonedMat;
    }

    box.material = finalMat;
    box.checkCollisions = collision;
    box.isVisible = visible;
    return box;
  }
}
