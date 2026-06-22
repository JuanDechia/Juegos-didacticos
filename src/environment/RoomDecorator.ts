import * as BABYLON from '@babylonjs/core';
import type { MetroMaterials } from './Materials';

export interface RoomBounds {
  min: BABYLON.Vector3;
  max: BABYLON.Vector3;
}

export class RoomDecorator {
  private scene: BABYLON.Scene;
  private materials: MetroMaterials;

  constructor(scene: BABYLON.Scene, materials: MetroMaterials) {
    this.scene = scene;
    this.materials = materials;
  }

  /**
   * Decora la habitación principal:
   * - Columnas con franjas amarillas/negras de seguridad.
   * - Marcas en el piso indicando salida / direcciones.
   * - Carteles en la pared trasera (Zona Central, Salida de Emergencia).
   * - Backplates de armas con marcos de neón azul detrás de las compras de pared.
   */
  public decorateMainRoom(_room: RoomBounds): void {
    // 1. Columnas de soporte (posiciones fijas del SubwayStationBuilder)
    const mainColPositions = [
      new BABYLON.Vector3(-9, 3.5, -3),
      new BABYLON.Vector3(-3, 3.5, -3),
      new BABYLON.Vector3(3, 3.5, -3),
      new BABYLON.Vector3(9, 3.5, -3),
    ];
    mainColPositions.forEach((pos) => {
      this.decorateColumnBase(pos);
    });

    // 2. Marcas en el piso
    // Flecha e indicación hacia la Habitación Izquierda (X = -15)
    this.createFloorMarking(
      'floor_marking_left',
      new BABYLON.Vector3(-11, 0, 1.5),
      3.0,
      1.5,
      'CARGO ZONE A',
      'left'
    );

    // Flecha e indicación hacia la Habitación Derecha (X = 15)
    this.createFloorMarking(
      'floor_marking_right',
      new BABYLON.Vector3(11, 0, 4.5),
      3.0,
      1.5,
      'GENERATOR ZONE B',
      'right'
    );

    // Línea de seguridad en el borde del andén
    this.createFloorMarking(
      'floor_marking_safety',
      new BABYLON.Vector3(0, 0, -8.5),
      14,
      1.0,
      'MIND THE GAP - NO ENTRY',
      'none'
    );

    // 3. Carteles / Señales en las paredes
    // Cartel de la estación sobre la pared trasera
    this.createSignboard(
      'station_sign',
      new BABYLON.Vector3(0, 5.0, -9.9),
      new BABYLON.Vector3(0, 0, 0),
      4.0,
      1.0,
      'DOWNTOWN METRO - SEC 3',
      '#1e293b',
      '#facc15',
      36,
      false
    );

    // Cartel luminoso de EXIT en la salida de emergencia
    this.createSignboard(
      'exit_sign',
      new BABYLON.Vector3(0, 6.2, 9.9),
      new BABYLON.Vector3(0, Math.PI, 0),
      1.8,
      0.6,
      'EXIT',
      '#166534',
      '#4ade80',
      48,
      true
    );

    // 4. Weapon racks con marcos neón
    // Las armas de la pared trasera se compran en:
    // Shotgun: x=-8, y=2.0, z=-9.8
    // SMG: x=8, y=2.0, z=-9.8
    this.createWeaponRack('rack_shotgun', new BABYLON.Vector3(-8, 2.0, -9.95), 0);
    this.createWeaponRack('rack_smg', new BABYLON.Vector3(8, 2.0, -9.95), 0);
  }

  /**
   * Decora la habitación lateral izquierda (Zona de Carga / Área Abierta):
   * - Tuberías industriales en techo y paredes.
   * - Pilas de cajas de carga (crates) de madera detalladas.
   * - Cartel indicador de la zona.
   */
  public decorateLeftRoom(_room: RoomBounds): void {
    // 1. Tuberías en el techo y pared
    // Tubería superior principal
    this.createPipe(
      new BABYLON.Vector3(-15.5, 6.2, 5),
      new BABYLON.Vector3(-27, 6.2, 5),
      'left_pipe_1'
    );
    // Tubería en ángulo que baja por la pared exterior
    this.createPipe(
      new BABYLON.Vector3(-27, 6.2, 5),
      new BABYLON.Vector3(-27, 0.5, 5),
      'left_pipe_2'
    );

    // Otra tubería cruzada en el techo
    this.createPipe(
      new BABYLON.Vector3(-21, 6.4, -4.5),
      new BABYLON.Vector3(-21, 6.4, 7.5),
      'left_pipe_3'
    );

    // 2. Pilas de crates (cajas de madera detalladas con marcos)
    // Pila 1 en la esquina trasera izquierda
    this.createCrate('crate_l1', new BABYLON.Vector3(-25, 0.5, -3), 0.1, 1.0);
    this.createCrate('crate_l2', new BABYLON.Vector3(-23.8, 0.5, -3.2), -0.2, 1.0);
    this.createCrate('crate_l3', new BABYLON.Vector3(-24.4, 1.5, -3.1), 0.35, 0.9); // Crate superior un poco girada

    // Pila 2 en la pared del fondo
    this.createCrate('crate_l4', new BABYLON.Vector3(-25.5, 0.6, 6.5), 0.5, 1.2);
    this.createCrate('crate_l5', new BABYLON.Vector3(-23.8, 0.5, 6.7), 0.0, 1.0);

    // 3. Cartel indicador
    this.createSignboard(
      'left_room_sign',
      new BABYLON.Vector3(-21, 5.0, 8.4),
      new BABYLON.Vector3(0, Math.PI, 0),
      3.0,
      0.8,
      'STORAGE DEPT - AREA A',
      '#1e293b',
      '#3b82f6',
      28,
      false
    );
  }

  /**
   * Decora la habitación lateral derecha (Pasillo Estrecho y Peligroso):
   * - Panel eléctrico de alta tensión con decals de peligro y luces de neón parpadeantes/activas.
   * - Tuberías bajas a lo largo de las paredes.
   * - Señal luminosa de peligro.
   * - Backplate de arma con marco neón para la Machine Gun.
   */
  public decorateRightRoom(_room: RoomBounds): void {
    // 1. Tuberías bajas (a lo largo de las paredes laterales en el suelo)
    this.createPipe(
      new BABYLON.Vector3(15.5, 0.4, 2.5),
      new BABYLON.Vector3(25, 0.4, 2.5),
      'right_pipe_low_1'
    );
    this.createPipe(
      new BABYLON.Vector3(25, 0.4, 2.5),
      new BABYLON.Vector3(25, 0.4, 7.5),
      'right_pipe_low_2'
    );

    // 2. Panel eléctrico detallado en la pared del fondo (X=20, Z=8.5 es la pared norte)
    // Colocado contra la pared norte: Z = 8.4, mirando hacia el sur (rotY = Math.PI)
    this.createElectricalPanel('main_electrical_panel', new BABYLON.Vector3(20, 2.2, 8.2), Math.PI);

    // 3. Señal de peligro eléctrica en la pared lateral exterior (X = 25.5, mirando hacia el oeste)
    this.createSignboard(
      'danger_voltage_sign',
      new BABYLON.Vector3(25.4, 4.5, 4.5),
      new BABYLON.Vector3(0, -Math.PI / 2, 0),
      2.0,
      1.0,
      'DANGER: HIGH VOLTAGE',
      '#ef4444',
      '#ffffff',
      24,
      true
    );

    // 4. Weapon Buy Rack para la Machine Gun
    // Machine gun en SubwayStationBuilder está en:
    // x=24.8, y=2.0, z=4.5, rotY=Math.PI / 2
    // El rack debe ir pegado a la pared derecha (X=25.5), rotY = -Math.PI / 2
    this.createWeaponRack('rack_machinegun', new BABYLON.Vector3(25.4, 2.0, 4.5), -Math.PI / 2);
  }

  // --- MÉTODOS AUXILIARES ---

  /** Crea una tubería cilíndrica entre dos puntos */
  private createPipe(start: BABYLON.Vector3, end: BABYLON.Vector3, name: string): void {
    const distance = BABYLON.Vector3.Distance(start, end);
    const pipe = BABYLON.MeshBuilder.CreateCylinder(
      name,
      { height: distance, diameter: 0.12, tessellation: 8 },
      this.scene
    );

    pipe.position = BABYLON.Vector3.Center(start, end);

    const direction = end.subtract(start);
    direction.normalize();
    const up = new BABYLON.Vector3(0, 1, 0);

    const rotationAxis = BABYLON.Vector3.Cross(up, direction);
    if (rotationAxis.lengthSquared() > 0.0001) {
      rotationAxis.normalize();
      const angle = Math.acos(BABYLON.Vector3.Dot(up, direction));
      pipe.rotationQuaternion = BABYLON.Quaternion.RotationAxis(rotationAxis, angle);
    } else if (direction.y < 0) {
      pipe.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI);
    }

    pipe.material = this.materials.column; // Material de columna oscura / metálica
    pipe.checkCollisions = false;

    // Soportes/Abrazaderas
    const bracketStart = BABYLON.MeshBuilder.CreateBox(
      name + '_br_s',
      { width: 0.18, height: 0.18, depth: 0.18 },
      this.scene
    );
    bracketStart.position = start.clone();
    bracketStart.material = this.materials.column;
    bracketStart.checkCollisions = false;

    const bracketEnd = BABYLON.MeshBuilder.CreateBox(
      name + '_br_e',
      { width: 0.18, height: 0.18, depth: 0.18 },
      this.scene
    );
    bracketEnd.position = end.clone();
    bracketEnd.material = this.materials.column;
    bracketEnd.checkCollisions = false;
  }

  /** Crea una caja (crate) de madera con bordes y tiras cruzadas detalladas */
  private createCrate(name: string, pos: BABYLON.Vector3, rotY: number, size: number): BABYLON.Mesh {
    const crate = BABYLON.MeshBuilder.CreateBox(name, { size: size }, this.scene);
    crate.position = pos.clone();
    crate.rotation.y = rotY;

    const woodMat = new BABYLON.StandardMaterial(name + '_woodMat', this.scene);
    woodMat.diffuseColor = new BABYLON.Color3(0.48, 0.31, 0.18); // Marrón madera
    woodMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    crate.material = woodMat;
    crate.checkCollisions = true;

    // Añadir tablones en relieve en las caras
    const frameThickness = size * 0.09;
    const frameDepth = size * 0.04;
    const fMat = new BABYLON.StandardMaterial(name + '_frameMat', this.scene);
    fMat.diffuseColor = new BABYLON.Color3(0.35, 0.21, 0.11); // Madera más oscura
    fMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    // Tablones para la cara frontal (+Z)
    const frameTop = BABYLON.MeshBuilder.CreateBox('f_t', { width: size, height: frameThickness, depth: frameDepth }, this.scene);
    frameTop.position = new BABYLON.Vector3(0, size / 2 - frameThickness / 2, size / 2 + frameDepth / 2);
    frameTop.material = fMat;
    frameTop.parent = crate;
    frameTop.checkCollisions = false;

    const frameBot = BABYLON.MeshBuilder.CreateBox('f_b', { width: size, height: frameThickness, depth: frameDepth }, this.scene);
    frameBot.position = new BABYLON.Vector3(0, -size / 2 + frameThickness / 2, size / 2 + frameDepth / 2);
    frameBot.material = fMat;
    frameBot.parent = crate;
    frameBot.checkCollisions = false;

    const frameL = BABYLON.MeshBuilder.CreateBox('f_l', { width: frameThickness, height: size - frameThickness * 2, depth: frameDepth }, this.scene);
    frameL.position = new BABYLON.Vector3(-size / 2 + frameThickness / 2, 0, size / 2 + frameDepth / 2);
    frameL.material = fMat;
    frameL.parent = crate;
    frameL.checkCollisions = false;

    const frameR = BABYLON.MeshBuilder.CreateBox('f_r', { width: frameThickness, height: size - frameThickness * 2, depth: frameDepth }, this.scene);
    frameR.position = new BABYLON.Vector3(size / 2 - frameThickness / 2, 0, size / 2 + frameDepth / 2);
    frameR.material = fMat;
    frameR.parent = crate;
    frameR.checkCollisions = false;

    const diagonal = BABYLON.MeshBuilder.CreateBox('f_d', { width: frameThickness, height: size * 1.2, depth: frameDepth * 0.8 }, this.scene);
    diagonal.position = new BABYLON.Vector3(0, 0, size / 2 + frameDepth / 2);
    diagonal.rotation.z = Math.PI / 4;
    diagonal.material = fMat;
    diagonal.parent = crate;
    diagonal.checkCollisions = false;

    // Clonar para la cara trasera (-Z)
    const frameTop2 = frameTop.clone('f_t2', crate);
    frameTop2.position.z = -(size / 2 + frameDepth / 2);
    const frameBot2 = frameBot.clone('f_b2', crate);
    frameBot2.position.z = -(size / 2 + frameDepth / 2);
    const frameL2 = frameL.clone('f_l2', crate);
    frameL2.position.z = -(size / 2 + frameDepth / 2);
    const frameR2 = frameR.clone('f_r2', crate);
    frameR2.position.z = -(size / 2 + frameDepth / 2);
    const diagonal2 = diagonal.clone('f_d2', crate);
    diagonal2.position.z = -(size / 2 + frameDepth / 2);
    diagonal2.rotation.z = -Math.PI / 4;

    return crate;
  }

  /** Crea un panel eléctrico con interruptores/indicadores de neón y placa de advertencia */
  private createElectricalPanel(name: string, pos: BABYLON.Vector3, rotY: number): void {
    const panel = BABYLON.MeshBuilder.CreateBox(name, { width: 0.9, height: 1.3, depth: 0.2 }, this.scene);
    panel.position = pos.clone();
    panel.rotation.y = rotY;

    const panelMat = new BABYLON.StandardMaterial(name + '_panelMat', this.scene);
    panelMat.diffuseColor = new BABYLON.Color3(0.25, 0.27, 0.3);
    panelMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    panel.material = panelMat;
    panel.checkCollisions = false;

    // Puerta del panel
    const door = BABYLON.MeshBuilder.CreateBox(name + '_door', { width: 0.75, height: 1.1, depth: 0.05 }, this.scene);
    door.position = new BABYLON.Vector3(0, 0, 0.1);
    door.parent = panel;

    const doorMat = new BABYLON.StandardMaterial(name + '_doorMat', this.scene);
    doorMat.diffuseColor = new BABYLON.Color3(0.35, 0.38, 0.42);
    door.material = doorMat;
    door.checkCollisions = false;

    // Cartel de peligro eléctrico (decal en relieve)
    const dangerSign = BABYLON.MeshBuilder.CreatePlane(name + '_danger', { width: 0.35, height: 0.35 }, this.scene);
    dangerSign.position = new BABYLON.Vector3(0, 0.2, 0.03);
    dangerSign.parent = door;

    const signTex = new BABYLON.DynamicTexture(name + '_signTex', 256, this.scene, true);
    const sCtx = signTex.getContext() as CanvasRenderingContext2D;
    sCtx.fillStyle = '#facc15';
    sCtx.fillRect(0, 0, 256, 256);

    sCtx.strokeStyle = '#000000';
    sCtx.lineWidth = 16;
    sCtx.strokeRect(10, 10, 236, 236);
    sCtx.fillStyle = '#000000';
    sCtx.font = 'bold 36px Arial';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('DANGER', 128, 100);
    sCtx.fillText('10000V', 128, 160);

    signTex.update();
    const dangerMat = new BABYLON.StandardMaterial(name + '_dangerMat', this.scene);
    dangerMat.diffuseTexture = signTex;
    dangerMat.specularColor = BABYLON.Color3.Black();
    dangerSign.material = dangerMat;
    dangerSign.checkCollisions = false;

    // Luces de estado de neón
    const bulbGreen = BABYLON.MeshBuilder.CreateBox(name + '_bulbG', { width: 0.08, height: 0.08, depth: 0.08 }, this.scene);
    bulbGreen.position = new BABYLON.Vector3(-0.2, -0.3, 0.03);
    bulbGreen.parent = door;
    bulbGreen.material = this.materials.neonGreen;
    bulbGreen.checkCollisions = false;

    const bulbRed = BABYLON.MeshBuilder.CreateBox(name + '_bulbR', { width: 0.08, height: 0.08, depth: 0.08 }, this.scene);
    bulbRed.position = new BABYLON.Vector3(0.2, -0.3, 0.03);
    bulbRed.parent = door;
    bulbRed.material = this.materials.neonRed;
    bulbRed.checkCollisions = false;

    // Tubo protector que sale por arriba
    this.createPipe(
      panel.position.add(new BABYLON.Vector3(0, 0.65, 0)),
      panel.position.add(new BABYLON.Vector3(0, 2.4, 0)),
      name + '_conduit'
    );
  }

  /** Crea un letrero/cartel flotante en la pared con texto personalizado */
  private createSignboard(
    name: string,
    pos: BABYLON.Vector3,
    rot: BABYLON.Vector3,
    width: number,
    height: number,
    text: string,
    bgColor: string,
    textColor: string,
    fontSize: number,
    isNeon: boolean
  ): void {
    const board = BABYLON.MeshBuilder.CreateBox(name, { width: width, height: height, depth: 0.05 }, this.scene);
    board.position = pos.clone();
    board.rotation = rot.clone();
    board.checkCollisions = false;

    const back = BABYLON.MeshBuilder.CreateBox(name + '_back', { width: width + 0.1, height: height + 0.1, depth: 0.06 }, this.scene);
    back.position = pos.clone();
    back.rotation = rot.clone();
    back.material = this.materials.column; // Acero oscuro
    back.checkCollisions = false;

    const textureWidth = 512;
    const textureHeight = Math.round(512 * (height / width));
    const dynamicTexture = new BABYLON.DynamicTexture(name + '_dynTex', { width: textureWidth, height: textureHeight }, this.scene, true);

    const ctx = dynamicTexture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, textureWidth, textureHeight);

    ctx.lineWidth = 10;
    ctx.strokeStyle = textColor;
    ctx.strokeRect(5, 5, textureWidth - 10, textureHeight - 10);

    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, textureWidth / 2, textureHeight / 2);

    dynamicTexture.update();

    const mat = new BABYLON.StandardMaterial(name + '_mat', this.scene);
    mat.diffuseTexture = dynamicTexture;

    if (isNeon) {
      mat.emissiveTexture = dynamicTexture;
      mat.disableLighting = true;
    } else {
      mat.specularColor = BABYLON.Color3.Black();
    }

    board.material = mat;
  }

  /** Crea marcas en el suelo (safety zone stripes, flechas o avisos) */
  private createFloorMarking(
    name: string,
    pos: BABYLON.Vector3,
    width: number,
    height: number,
    text: string,
    arrowDirection: 'left' | 'right' | 'none'
  ): void {
    const marking = BABYLON.MeshBuilder.CreatePlane(name, { width: width, height: height }, this.scene);
    marking.position = pos.clone();
    marking.position.y = 0.01; // Evitar Z-fighting
    marking.rotation.x = Math.PI / 2;
    marking.checkCollisions = false;

    const texWidth = 512;
    const texHeight = Math.round(512 * (height / width));
    const dynamicTexture = new BABYLON.DynamicTexture(name + '_markingTex', { width: texWidth, height: texHeight }, this.scene, true);
    const ctx = dynamicTexture.getContext() as CanvasRenderingContext2D;

    // Fondo gris oscuro semi-transparente
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.fillRect(0, 0, texWidth, texHeight);

    // Bordes reflectivos de seguridad
    const stripeWidth = 24;
    ctx.fillStyle = '#facc15'; // Amarillo de seguridad
    ctx.fillRect(0, 0, texWidth, stripeWidth);
    ctx.fillRect(0, texHeight - stripeWidth, texWidth, stripeWidth);

    ctx.fillStyle = '#000000'; // Rayas negras diagonales en bordes
    for (let i = 0; i < texWidth; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 20, 0);
      ctx.lineTo(i, stripeWidth);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(i, texHeight - stripeWidth);
      ctx.lineTo(i + 20, texHeight - stripeWidth);
      ctx.lineTo(i, texHeight);
      ctx.closePath();
      ctx.fill();
    }

    // Texto en el centro
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, texWidth / 2, texHeight / 2);

    // Flechas indicativas
    if (arrowDirection !== 'none') {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      if (arrowDirection === 'left') {
        ctx.moveTo(30, texHeight / 2);
        ctx.lineTo(70, texHeight / 2 - 20);
        ctx.lineTo(70, texHeight / 2 - 8);
        ctx.lineTo(110, texHeight / 2 - 8);
        ctx.lineTo(110, texHeight / 2 + 8);
        ctx.lineTo(70, texHeight / 2 + 8);
        ctx.lineTo(70, texHeight / 2 + 20);
      } else {
        ctx.moveTo(texWidth - 30, texHeight / 2);
        ctx.lineTo(texWidth - 70, texHeight / 2 - 20);
        ctx.lineTo(texWidth - 70, texHeight / 2 - 8);
        ctx.lineTo(texWidth - 110, texHeight / 2 - 8);
        ctx.lineTo(texWidth - 110, texHeight / 2 + 8);
        ctx.lineTo(texWidth - 70, texHeight / 2 + 8);
        ctx.lineTo(texWidth - 70, texHeight / 2 + 20);
      }
      ctx.closePath();
      ctx.fill();
    }

    dynamicTexture.update();

    const mat = new BABYLON.StandardMaterial(name + '_mat', this.scene);
    mat.diffuseTexture = dynamicTexture;
    mat.specularColor = BABYLON.Color3.Black();
    mat.useAlphaFromDiffuseTexture = true;

    marking.material = mat;
  }

  /** Crea un soporte metálico retroiluminado con neón para exhibir las armas de pared */
  private createWeaponRack(name: string, pos: BABYLON.Vector3, rotY: number): void {
    const rack = BABYLON.MeshBuilder.CreateBox(name, { width: 2.2, height: 1.3, depth: 0.08 }, this.scene);
    rack.position = pos.clone();
    rack.rotation.y = rotY;
    rack.checkCollisions = false;

    const rackMat = new BABYLON.StandardMaterial(name + '_rackMat', this.scene);
    rackMat.diffuseColor = new BABYLON.Color3(0.12, 0.13, 0.15);
    rackMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    rack.material = rackMat;

    // Crear un marco de neón cian/azul para visibilidad
    const neonBorderThickness = 0.04;
    const neonBorderColor = this.materials.neonBlue;

    // Borde Superior
    const topBorder = BABYLON.MeshBuilder.CreateBox(name + '_tBorder', { width: 2.2, height: neonBorderThickness, depth: 0.02 }, this.scene);
    topBorder.position = new BABYLON.Vector3(0, 0.65 - neonBorderThickness / 2, 0.05);
    topBorder.parent = rack;
    topBorder.material = neonBorderColor;
    topBorder.checkCollisions = false;

    // Borde Inferior
    const botBorder = BABYLON.MeshBuilder.CreateBox(name + '_bBorder', { width: 2.2, height: neonBorderThickness, depth: 0.02 }, this.scene);
    botBorder.position = new BABYLON.Vector3(0, -0.65 + neonBorderThickness / 2, 0.05);
    botBorder.parent = rack;
    botBorder.material = neonBorderColor;
    botBorder.checkCollisions = false;

    // Borde Izquierdo
    const leftBorder = BABYLON.MeshBuilder.CreateBox(name + '_lBorder', { width: neonBorderThickness, height: 1.3 - neonBorderThickness * 2, depth: 0.02 }, this.scene);
    leftBorder.position = new BABYLON.Vector3(-1.1 + neonBorderThickness / 2, 0, 0.05);
    leftBorder.parent = rack;
    leftBorder.material = neonBorderColor;
    leftBorder.checkCollisions = false;

    // Borde Derecho
    const rightBorder = BABYLON.MeshBuilder.CreateBox(name + '_rBorder', { width: neonBorderThickness, height: 1.3 - neonBorderThickness * 2, depth: 0.02 }, this.scene);
    rightBorder.position = new BABYLON.Vector3(1.1 - neonBorderThickness / 2, 0, 0.05);
    rightBorder.parent = rack;
    rightBorder.material = neonBorderColor;
    rightBorder.checkCollisions = false;
  }

  /** Agrega franjas de advertencia alrededor de las bases de las columnas */
  private decorateColumnBase(colPos: BABYLON.Vector3): void {
    const baseSheath = BABYLON.MeshBuilder.CreateBox('col_base_' + colPos.x + '_' + colPos.z, { width: 0.84, height: 1.2, depth: 0.84 }, this.scene);
    baseSheath.position = new BABYLON.Vector3(colPos.x, 0.6, colPos.z);

    const tex = new BABYLON.DynamicTexture('col_base_tex_' + colPos.x + '_' + colPos.z, 256, this.scene, true);
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#000000';
    for (let i = -128; i < 384; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 24, 0);
      ctx.lineTo(i + 128, 256);
      ctx.lineTo(i + 104, 256);
      ctx.closePath();
      ctx.fill();
    }

    tex.update();
    const mat = new BABYLON.StandardMaterial('col_base_mat_' + colPos.x + '_' + colPos.z, this.scene);
    mat.diffuseTexture = tex;
    mat.specularColor = BABYLON.Color3.Black();
    baseSheath.material = mat;
    baseSheath.checkCollisions = false;
  }
}
