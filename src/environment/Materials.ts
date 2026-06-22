import * as BABYLON from '@babylonjs/core';
import { createBrickWallMaterial } from './materials/BrickMaterialFactory';
import { createPaintedWallMaterial } from './materials/PaintedWallMaterialFactory';

export class Materials {
  public static createMetroMaterials(scene: BABYLON.Scene) {
    // 1. Material del Suelo (Gris oscuro con algo de especularidad - aclarado)
    const floorMat = new BABYLON.StandardMaterial('floorMaterial', scene);
    floorMat.diffuseColor = new BABYLON.Color3(0.28, 0.28, 0.32);
    floorMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    floorMat.specularPower = 64;

    // 2. Material de Paredes (Gris medio mate - aclarado)
    const wallMat = new BABYLON.StandardMaterial('wallMaterial', scene);
    wallMat.diffuseColor = new BABYLON.Color3(0.42, 0.42, 0.46);
    wallMat.specularColor = BABYLON.Color3.Black(); // Sin reflejos

    // 3. Material de Columnas (Gris carbón texturizado o metálico suave - aclarado)
    const columnMat = new BABYLON.StandardMaterial('columnMaterial', scene);
    columnMat.diffuseColor = new BABYLON.Color3(0.22, 0.22, 0.25);
    columnMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    columnMat.specularPower = 32;

    // 4. Material de Andén (Concreto con borde amarillo - aclarado)
    const platformMat = new BABYLON.StandardMaterial('platformMaterial', scene);
    platformMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.38);
    platformMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    // 5. Material del Borde del Andén (Amarillo reflectivo / emisivo de seguridad)
    const platformEdgeMat = new BABYLON.StandardMaterial('platformEdgeMaterial', scene);
    platformEdgeMat.diffuseColor = new BABYLON.Color3(0.85, 0.65, 0.0);
    platformEdgeMat.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.0); // Brillo sutil

    // 6. Material de Vías del Tren (Metal oxidado / negro)
    const tracksMat = new BABYLON.StandardMaterial('tracksMaterial', scene);
    tracksMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    tracksMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    // 7. Material Emisivo Neón (Para luces, indicadores y decoración)
    const neonBlueMat = new BABYLON.StandardMaterial('neonBlueMaterial', scene);
    neonBlueMat.diffuseColor = new BABYLON.Color3(0.0, 0.8, 1.0);
    neonBlueMat.emissiveColor = new BABYLON.Color3(0.0, 0.5, 0.7);

    const neonPurpleMat = new BABYLON.StandardMaterial('neonPurpleMaterial', scene);
    neonPurpleMat.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0.8);
    neonPurpleMat.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.6);

    const neonRedMat = new BABYLON.StandardMaterial('neonRedMaterial', scene);
    neonRedMat.diffuseColor = new BABYLON.Color3(1.0, 0.1, 0.3);
    neonRedMat.emissiveColor = new BABYLON.Color3(0.7, 0.0, 0.2);

    const neonGreenMat = new BABYLON.StandardMaterial('neonGreenMaterial', scene);
    neonGreenMat.diffuseColor = new BABYLON.Color3(0.0, 0.9, 0.6);
    neonGreenMat.emissiveColor = new BABYLON.Color3(0.0, 0.6, 0.4);

    return {
      floor: floorMat,
      wall: wallMat,
      column: columnMat,
      platform: platformMat,
      platformEdge: platformEdgeMat,
      tracks: tracksMat,
      neonBlue: neonBlueMat,
      neonPurple: neonPurpleMat,
      neonRed: neonRedMat,
      neonGreen: neonGreenMat,
      brickClassic: createBrickWallMaterial(scene, {
        baseColor: '#993d3d',
        mortarColor: '#d1d1d1',
        speckleColor: '#7a3030'
      }),
      brickDark: createBrickWallMaterial(scene, {
        baseColor: '#3c3e40',
        mortarColor: '#252627',
        speckleColor: '#282a2b'
      }),
      paintedBlue: createPaintedWallMaterial(scene, {
        middleColor: '#2563eb'
      }),
      paintedGreen: createPaintedWallMaterial(scene, {
        middleColor: '#059669'
      }),
      paintedOrange: createPaintedWallMaterial(scene, {
        middleColor: '#ea580c'
      }),
    };
  }
}
export type MetroMaterials = ReturnType<typeof Materials.createMetroMaterials>;
