import * as BABYLON from '@babylonjs/core';

export class Lights {
  public static setupMetroLights(scene: BABYLON.Scene) {
    // Ajustar color ambiental global de la escena
    scene.ambientColor = new BABYLON.Color3(0.35, 0.35, 0.38);

    // 1. Luz Hemisférica Ambiental — Aumentada e iluminada para claridad general
    const ambientLight = new BABYLON.HemisphericLight(
      'metroAmbientLight',
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    ambientLight.intensity = 0.55;
    ambientLight.diffuse = new BABYLON.Color3(0.8, 0.85, 0.9);
    ambientLight.groundColor = new BABYLON.Color3(0.3, 0.3, 0.35);

    // 2. Luces del Andén — Lámparas de techo con geometría
    const lampPositions = [
      new BABYLON.Vector3(-10, 5.8, 0),
      new BABYLON.Vector3(0, 5.8, 0),
      new BABYLON.Vector3(10, 5.8, 0),
      // Lámpara de la habitación lateral izquierda
      new BABYLON.Vector3(-21, 5.8, 1.5),
      // Lámpara de la habitación lateral derecha
      new BABYLON.Vector3(20, 5.8, 4.5),
    ];

    const pointLights: BABYLON.PointLight[] = [];

    lampPositions.forEach((pos, index) => {
      const light = new BABYLON.PointLight(`stationLamp_${index}`, pos, scene);
      light.intensity = 0.7;
      light.range = 20;
      light.diffuse = new BABYLON.Color3(1.0, 0.94, 0.82);
      light.specular = new BABYLON.Color3(1.0, 1.0, 0.9);
      pointLights.push(light);

      // Geometría visual de la lámpara: base + bombilla emisiva
      const lampBase = BABYLON.MeshBuilder.CreateBox(
        `lampBase_${index}`,
        { width: 1.8, height: 0.08, depth: 0.35 },
        scene
      );
      lampBase.position = pos.clone();

      const lampBaseMat = new BABYLON.StandardMaterial(`lampBaseMat_${index}`, scene);
      lampBaseMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
      lampBase.material = lampBaseMat;

      // Bombilla emisiva (rectángulo brillante)
      const lampGlass = BABYLON.MeshBuilder.CreateBox(
        `lampGlass_${index}`,
        { width: 1.5, height: 0.06, depth: 0.28 },
        scene
      );
      lampGlass.position = new BABYLON.Vector3(pos.x, pos.y - 0.07, pos.z);

      const lampMat = new BABYLON.StandardMaterial(`lampMat_${index}`, scene);
      lampMat.diffuseColor = new BABYLON.Color3(1, 1, 0.9);
      lampMat.emissiveColor = new BABYLON.Color3(0.95, 0.85, 0.6);
      lampMat.disableLighting = true;
      lampGlass.material = lampMat;
    });

    // Point lights de soporte por habitación para evitar sombras oscuras
    const roomLightMain = new BABYLON.PointLight('roomLight_main', new BABYLON.Vector3(0, 4, 0), scene);
    roomLightMain.intensity = 0.8;
    roomLightMain.range = 18;

    const roomLightLeft = new BABYLON.PointLight('roomLight_left', new BABYLON.Vector3(-21, 4, 1.5), scene);
    roomLightLeft.intensity = 0.7;
    roomLightLeft.range = 15;

    const roomLightRight = new BABYLON.PointLight('roomLight_right', new BABYLON.Vector3(20, 4, 4.5), scene);
    roomLightRight.intensity = 0.7;
    roomLightRight.range = 15;

    // 3. Animación sutil de parpadeo en una de las lámparas (simula tubo fluorescente viejo)
    const flickerLight = pointLights[2];
    let flickerAccum = 0;
    scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      flickerAccum += dt;
      // Parpadeo cada ~3–5 segundos, muy breve (20ms)
      if (Math.sin(flickerAccum * 0.7) > 0.998) {
        flickerLight.intensity = Math.random() < 0.5 ? 0.15 : 0.7;
      } else {
        flickerLight.intensity = 0.7;
      }
    });

    // 4. Luz de acento para el AnswerBoard (reposicionada para iluminación óptima directa)
    const boardLight = new BABYLON.SpotLight(
      'boardSpotLight',
      new BABYLON.Vector3(0, 6.5, 7.9),
      new BABYLON.Vector3(0, -0.5, 1),
      Math.PI / 3,
      2,
      scene
    );
    boardLight.intensity = 1.2;
    boardLight.range = 18;
    boardLight.diffuse = new BABYLON.Color3(0.8, 0.9, 1.0); // Luz blanca con leve tono azul/celeste
    boardLight.specular = new BABYLON.Color3(0.8, 0.9, 1.0);

    // 5. Luz neón de borde de andén (amarilla/naranja, simula la franja de seguridad)
    const platformEdgeLight = new BABYLON.PointLight(
      'platformEdgeGlow',
      new BABYLON.Vector3(0, 1.1, 2.0),
      scene
    );
    platformEdgeLight.intensity = 0.25;
    platformEdgeLight.range = 30;
    platformEdgeLight.diffuse = new BABYLON.Color3(1.0, 0.85, 0.1);

    // 6. Luces de acento laterales (neón morado/azul) en las paredes laterales
    const leftNeon = new BABYLON.PointLight(
      'leftNeonAccent',
      new BABYLON.Vector3(-13, 2, -2),
      scene
    );
    leftNeon.intensity = 0.35;
    leftNeon.range = 12;
    leftNeon.diffuse = new BABYLON.Color3(0.6, 0.0, 1.0); // Morado

    const rightNeon = new BABYLON.PointLight(
      'rightNeonAccent',
      new BABYLON.Vector3(13, 2, -2),
      scene
    );
    rightNeon.intensity = 0.35;
    rightNeon.range = 12;
    rightNeon.diffuse = new BABYLON.Color3(0.0, 0.7, 1.0); // Cian

    // 7. Luces exteriores cerca de futuras ventanas (Fase 2 - luz fría / contrastante)
    const extLeftLight = new BABYLON.PointLight(
      'extWindowLight_left',
      new BABYLON.Vector3(-28.5, 3.5, 1.5),
      scene
    );
    extLeftLight.intensity = 0.6;
    extLeftLight.range = 12;
    extLeftLight.diffuse = new BABYLON.Color3(0.4, 0.6, 0.95);

    const extRightLight = new BABYLON.PointLight(
      'extWindowLight_right',
      new BABYLON.Vector3(26.5, 3.5, 4.5),
      scene
    );
    extRightLight.intensity = 0.6;
    extRightLight.range = 12;
    extRightLight.diffuse = new BABYLON.Color3(0.4, 0.6, 0.95);

    const extNorthLeftLight = new BABYLON.PointLight(
      'extWindowLight_northLeft',
      new BABYLON.Vector3(-8, 3.5, 11.5),
      scene
    );
    extNorthLeftLight.intensity = 0.6;
    extNorthLeftLight.range = 12;
    extNorthLeftLight.diffuse = new BABYLON.Color3(0.4, 0.6, 0.95);

    const extNorthRightLight = new BABYLON.PointLight(
      'extWindowLight_northRight',
      new BABYLON.Vector3(8, 3.5, 11.5),
      scene
    );
    extNorthRightLight.intensity = 0.6;
    extNorthRightLight.range = 12;
    extNorthRightLight.diffuse = new BABYLON.Color3(0.4, 0.6, 0.95);

    // Animación de respiración para luces neón laterales (pulsación suave)
    let pulseTime = 0;
    scene.onBeforeRenderObservable.add(() => {
      pulseTime += scene.getEngine().getDeltaTime() / 1000;
      const pulse = 0.3 + 0.12 * Math.sin(pulseTime * 1.5);
      leftNeon.intensity = pulse;
      rightNeon.intensity = pulse;
    });

    return {
      ambient: ambientLight,
      lamps: pointLights,
      boardSpot: boardLight,
      leftNeon,
      rightNeon,
    };
  }
}

export type MetroLights = ReturnType<typeof Lights.setupMetroLights>;
