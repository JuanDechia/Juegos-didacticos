import * as BABYLON from '@babylonjs/core';

export class FloatingLabel {
  private scene: BABYLON.Scene;
  private parentMesh: BABYLON.AbstractMesh;
  private labelMesh: BABYLON.Mesh;
  private texture: BABYLON.DynamicTexture;

  constructor(scene: BABYLON.Scene, parentMesh: BABYLON.AbstractMesh, text: string) {
    this.scene = scene;
    this.parentMesh = parentMesh;

    // Crear un plano flotante para el texto
    this.labelMesh = BABYLON.MeshBuilder.CreatePlane(
      `floatingLabel_${parentMesh.name}`,
      { width: 1.2, height: 0.6 },
      this.scene
    );

    // Posicionarlo por encima de la cabeza del enemigo (la caja mide 1.5 de alto, así que +1.2 es adecuado)
    this.labelMesh.position = new BABYLON.Vector3(0, 1.2, 0);
    this.labelMesh.parent = this.parentMesh; // Seguir los movimientos del enemigo

    // Comportamiento de Billboard para que siempre mire a la cámara
    this.labelMesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    // Crear textura dinámica para renderizar el texto
    const textureWidth = 256;
    const textureHeight = 128;
    this.texture = new BABYLON.DynamicTexture(
      `dynamicText_${parentMesh.name}`,
      { width: textureWidth, height: textureHeight },
      this.scene,
      false
    );

    const material = new BABYLON.StandardMaterial(`labelMat_${parentMesh.name}`, this.scene);
    material.diffuseTexture = this.texture;
    material.specularColor = BABYLON.Color3.Black();
    material.emissiveColor = BABYLON.Color3.White(); // Que brille en la oscuridad del metro
    material.backFaceCulling = false; // Visible desde atrás si fuera necesario, aunque es billboard
    
    // Soporte de transparencia
    this.texture.hasAlpha = true;
    material.useAlphaFromDiffuseTexture = true;
    
    this.labelMesh.material = material;

    this.setText(text);
  }

  /**
   * Actualiza el texto dibujado en la textura dinámica
   */
  public setText(text: string): void {
    const ctx = this.texture.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 128);

    // Dibujar fondo de tarjeta redondeado oscuro semi-transparente
    ctx.fillStyle = 'rgba(15, 15, 27, 0.85)';
    this.drawRoundedRect(ctx, 10, 10, 236, 108, 15);
    ctx.fill();

    // Dibujar borde brillante de HSL celeste
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00d2ff';
    ctx.stroke();

    // Dibujar la letra (A, B, C, D) centrada
    ctx.fillStyle = '#f8f9fa';
    ctx.font = 'bold 70px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    this.texture.update();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public setVisible(visible: boolean): void {
    this.labelMesh.setEnabled(visible);
  }

  public dispose(): void {
    if (this.labelMesh.material) {
      this.labelMesh.material.dispose();
    }
    this.texture.dispose();
    this.labelMesh.dispose();
  }
}
