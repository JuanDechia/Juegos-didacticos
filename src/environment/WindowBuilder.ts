import * as BABYLON from '@babylonjs/core';

export interface WindowEntryPoint {
  id: string;
  windowPosition: BABYLON.Vector3;
  exteriorSpawnPosition: BABYLON.Vector3;
  approachPosition: BABYLON.Vector3;
  climbStartPosition: BABYLON.Vector3;
  climbEndPosition: BABYLON.Vector3;
  insideLandingPosition: BABYLON.Vector3;
}

export class WindowBuilder {
  /**
   * Builds a wall with a window opening and frame.
   * Returns a WindowEntryPoint with coordinates.
   */
  public static build(
    scene: BABYLON.Scene,
    id: string,
    wallCenter: BABYLON.Vector3,
    wallWidth: number,
    wallHeight: number,
    wallThickness: number,
    orientation: 'X' | 'Z',
    outNormal: BABYLON.Vector3,
    windowWidth: number,
    windowHeight: number,
    windowBottom: number,
    wallMaterial: BABYLON.Material,
  ): WindowEntryPoint {
    const inNormal = outNormal.scale(-1);

    // Helper to make a box and handle brick scaling if needed
    const makeWallBox = (name: string, w: number, h: number, d: number, pos: BABYLON.Vector3) => {
      const box = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
      box.position = pos.clone();

      let finalMat = wallMaterial;
      if (wallMaterial instanceof BABYLON.StandardMaterial && wallMaterial.name.indexOf('brick') !== -1 && wallMaterial.diffuseTexture) {
        const clonedMat = wallMaterial.clone(name + '_brick_cloned');
        const diffTex = clonedMat.diffuseTexture as BABYLON.Texture;

        const actualWidth = Math.max(w, d);
        const actualHeight = h;

        diffTex.uScale = actualWidth / 0.8;
        diffTex.vScale = actualHeight / 0.3;
        finalMat = clonedMat;
      }

      box.material = finalMat;
      box.checkCollisions = true;
      box.isVisible = true;
      return box;
    };

    // 1. Build Wall Segments
    if (orientation === 'X') {
      // Bottom box
      makeWallBox(
        `${id}_wall_bottom`,
        wallWidth,
        windowBottom,
        wallThickness,
        new BABYLON.Vector3(wallCenter.x, windowBottom / 2, wallCenter.z)
      );

      // Top box
      const topHeight = wallHeight - (windowBottom + windowHeight);
      if (topHeight > 0) {
        makeWallBox(
          `${id}_wall_top`,
          wallWidth,
          topHeight,
          wallThickness,
          new BABYLON.Vector3(wallCenter.x, (wallHeight + windowBottom + windowHeight) / 2, wallCenter.z)
        );
      }

      // Left box
      const sideWidth = (wallWidth - windowWidth) / 2;
      if (sideWidth > 0) {
        makeWallBox(
          `${id}_wall_left`,
          sideWidth,
          windowHeight,
          wallThickness,
          new BABYLON.Vector3(wallCenter.x - (wallWidth + windowWidth) / 4, windowBottom + windowHeight / 2, wallCenter.z)
        );

        // Right box
        makeWallBox(
          `${id}_wall_right`,
          sideWidth,
          windowHeight,
          wallThickness,
          new BABYLON.Vector3(wallCenter.x + (wallWidth + windowWidth) / 4, windowBottom + windowHeight / 2, wallCenter.z)
        );
      }
    } else {
      // Orientation === 'Z'
      // Bottom box
      makeWallBox(
        `${id}_wall_bottom`,
        wallThickness,
        windowBottom,
        wallWidth,
        new BABYLON.Vector3(wallCenter.x, windowBottom / 2, wallCenter.z)
      );

      // Top box
      const topHeight = wallHeight - (windowBottom + windowHeight);
      if (topHeight > 0) {
        makeWallBox(
          `${id}_wall_top`,
          wallThickness,
          topHeight,
          wallWidth,
          new BABYLON.Vector3(wallCenter.x, (wallHeight + windowBottom + windowHeight) / 2, wallCenter.z)
        );
      }

      // Left box
      const sideWidth = (wallWidth - windowWidth) / 2;
      if (sideWidth > 0) {
        makeWallBox(
          `${id}_wall_left`,
          wallThickness,
          windowHeight,
          sideWidth,
          new BABYLON.Vector3(wallCenter.x, windowBottom + windowHeight / 2, wallCenter.z - (wallWidth + windowWidth) / 4)
        );

        // Right box
        makeWallBox(
          `${id}_wall_right`,
          wallThickness,
          windowHeight,
          sideWidth,
          new BABYLON.Vector3(wallCenter.x, windowBottom + windowHeight / 2, wallCenter.z + (wallWidth + windowWidth) / 4)
        );
      }
    }

    // 2. Build Window Frame
    let frameMat = scene.getMaterialByName('windowFrameMat');
    if (!frameMat) {
      const standardMat = new BABYLON.StandardMaterial('windowFrameMat', scene);
      standardMat.diffuseColor = new BABYLON.Color3(0.2, 0.15, 0.12);
      standardMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      frameMat = standardMat;
    }

    let glassMat = scene.getMaterialByName('windowGlassMat');
    if (!glassMat) {
      const standardMat = new BABYLON.StandardMaterial('windowGlassMat', scene);
      standardMat.diffuseColor = new BABYLON.Color3(0.7, 0.85, 1.0);
      standardMat.specularColor = new BABYLON.Color3(1, 1, 1);
      standardMat.specularPower = 64;
      standardMat.alpha = 0.2;
      glassMat = standardMat;
    }

    const holeCenter = new BABYLON.Vector3(
      wallCenter.x,
      windowBottom + windowHeight / 2,
      wallCenter.z
    );

    const frameThickness = 0.1;
    const frameDepth = wallThickness + 0.1;

    const makeFramePiece = (name: string, w: number, h: number, d: number, pos: BABYLON.Vector3) => {
      const box = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
      box.position = pos.clone();
      box.material = frameMat;
      box.checkCollisions = true;
      box.isVisible = true;
      return box;
    };

    if (orientation === 'X') {
      // Bottom frame sill
      makeFramePiece(
        `${id}_frame_sill`,
        windowWidth + 0.2,
        frameThickness,
        frameDepth + 0.05,
        new BABYLON.Vector3(holeCenter.x, windowBottom + frameThickness / 2, holeCenter.z)
      );

      // Top frame header
      makeFramePiece(
        `${id}_frame_header`,
        windowWidth + 0.2,
        frameThickness,
        frameDepth,
        new BABYLON.Vector3(holeCenter.x, windowBottom + windowHeight - frameThickness / 2, holeCenter.z)
      );

      // Left frame jamb
      makeFramePiece(
        `${id}_frame_jamb_left`,
        frameThickness,
        windowHeight - frameThickness * 2,
        frameDepth,
        new BABYLON.Vector3(holeCenter.x - windowWidth / 2 + frameThickness / 2, holeCenter.y, holeCenter.z)
      );

      // Right frame jamb
      makeFramePiece(
        `${id}_frame_jamb_right`,
        frameThickness,
        windowHeight - frameThickness * 2,
        frameDepth,
        new BABYLON.Vector3(holeCenter.x + windowWidth / 2 - frameThickness / 2, holeCenter.y, holeCenter.z)
      );

      // Window grid divider bars
      makeFramePiece(
        `${id}_frame_divider_v`,
        0.04,
        windowHeight - frameThickness * 2,
        0.04,
        new BABYLON.Vector3(holeCenter.x, holeCenter.y, holeCenter.z)
      );
      makeFramePiece(
        `${id}_frame_divider_h`,
        windowWidth - frameThickness * 2,
        0.04,
        0.04,
        new BABYLON.Vector3(holeCenter.x, holeCenter.y, holeCenter.z)
      );

      // 3. Build Glass Pane
      const glass = BABYLON.MeshBuilder.CreateBox(
        `${id}_glass`,
        { width: windowWidth - frameThickness * 2, height: windowHeight - frameThickness * 2, depth: 0.02 },
        scene
      );
      glass.position = holeCenter.clone();
      glass.material = glassMat;
      glass.checkCollisions = false;
      glass.isVisible = true;

    } else {
      // Orientation === 'Z'
      // Bottom frame sill
      makeFramePiece(
        `${id}_frame_sill`,
        frameDepth + 0.05,
        frameThickness,
        windowWidth + 0.2,
        new BABYLON.Vector3(holeCenter.x, windowBottom + frameThickness / 2, holeCenter.z)
      );

      // Top frame header
      makeFramePiece(
        `${id}_frame_header`,
        frameDepth,
        frameThickness,
        windowWidth + 0.2,
        new BABYLON.Vector3(holeCenter.x, windowBottom + windowHeight - frameThickness / 2, holeCenter.z)
      );

      // Left frame jamb
      makeFramePiece(
        `${id}_frame_jamb_left`,
        frameDepth,
        windowHeight - frameThickness * 2,
        frameThickness,
        new BABYLON.Vector3(holeCenter.x, holeCenter.y, holeCenter.z - windowWidth / 2 + frameThickness / 2)
      );

      // Right frame jamb
      makeFramePiece(
        `${id}_frame_jamb_right`,
        frameDepth,
        windowHeight - frameThickness * 2,
        frameThickness,
        new BABYLON.Vector3(holeCenter.x, holeCenter.y, holeCenter.z + windowWidth / 2 - frameThickness / 2)
      );

      // Window grid divider bars
      makeFramePiece(
        `${id}_frame_divider_v`,
        0.04,
        windowHeight - frameThickness * 2,
        0.04,
        new BABYLON.Vector3(holeCenter.x, holeCenter.y, holeCenter.z)
      );
      makeFramePiece(
        `${id}_frame_divider_h`,
        0.04,
        0.04,
        windowWidth - frameThickness * 2,
        new BABYLON.Vector3(holeCenter.x, holeCenter.y, holeCenter.z)
      );

      // 3. Build Glass Pane
      const glass = BABYLON.MeshBuilder.CreateBox(
        `${id}_glass`,
        { width: 0.02, height: windowHeight - frameThickness * 2, depth: windowWidth - frameThickness * 2 },
        scene
      );
      glass.position = holeCenter.clone();
      glass.material = glassMat;
      glass.checkCollisions = false;
      glass.isVisible = true;
    }

    // 4. Create Spotlight shining through window
    const lightPos = new BABYLON.Vector3(
      wallCenter.x + outNormal.x * 2.0,
      windowBottom + windowHeight / 2,
      wallCenter.z + outNormal.z * 2.0
    );

    const lightDir = new BABYLON.Vector3(
      inNormal.x,
      -0.3,
      inNormal.z
    ).normalize();

    const spotLight = new BABYLON.SpotLight(
      `${id}_spotlight`,
      lightPos,
      lightDir,
      Math.PI / 2.5,
      2,
      scene
    );
    spotLight.intensity = 1.8;
    spotLight.range = 25;
    spotLight.diffuse = new BABYLON.Color3(0.3, 0.5, 1.0);
    spotLight.specular = new BABYLON.Color3(0.3, 0.5, 1.0);

    // 5. Calculate positions
    const windowPosition = holeCenter.clone();

    const exteriorSpawnPosition = new BABYLON.Vector3(
      wallCenter.x + outNormal.x * 12.0,
      0,
      wallCenter.z + outNormal.z * 12.0
    );

    const approachPosition = new BABYLON.Vector3(
      wallCenter.x + outNormal.x * 1.5,
      0,
      wallCenter.z + outNormal.z * 1.5
    );

    const climbStartPosition = new BABYLON.Vector3(
      wallCenter.x + outNormal.x * 0.8,
      windowBottom,
      wallCenter.z + outNormal.z * 0.8
    );

    const climbEndPosition = new BABYLON.Vector3(
      wallCenter.x + inNormal.x * 0.8,
      windowBottom,
      wallCenter.z + inNormal.z * 0.8
    );

    const insideLandingPosition = new BABYLON.Vector3(
      wallCenter.x + inNormal.x * 2.0,
      0,
      wallCenter.z + inNormal.z * 2.0
    );

    return {
      id,
      windowPosition,
      exteriorSpawnPosition,
      approachPosition,
      climbStartPosition,
      climbEndPosition,
      insideLandingPosition,
    };
  }
}
