import * as BABYLON from '@babylonjs/core';

export interface PaintedWallMaterialOptions {
  topColor?: string;
  middleColor?: string;
  bottomColor?: string;
  dividerColor?: string;
}

/**
 * Crea un material de pared pintada con una base oscura, una franja de color media y una parte superior clara.
 */
export function createPaintedWallMaterial(
  scene: BABYLON.Scene,
  options?: PaintedWallMaterialOptions
): BABYLON.StandardMaterial {
  const topColor = options?.topColor ?? '#e3e1d9'; // Gris claro/beige cálido
  const middleColor = options?.middleColor ?? '#2563eb'; // Azul por defecto
  const bottomColor = options?.bottomColor ?? '#2f3136'; // Gris pizarra oscuro
  const dividerColor = options?.dividerColor ?? '#1e293b'; // Color oscuro para divisor

  const textureWidth = 256;
  const textureHeight = 512;

  const dynamicTexture = new BABYLON.DynamicTexture(
    'paintedWallTexture_' + Math.random().toString(36).substr(2, 5),
    { width: textureWidth, height: textureHeight },
    scene,
    true
  );

  const ctx = dynamicTexture.getContext();

  // 1. Dibujar banda superior (0 a 380)
  ctx.fillStyle = topColor;
  ctx.fillRect(0, 0, textureWidth, 380);

  // 2. Dibujar banda media (380 a 402)
  ctx.fillStyle = middleColor;
  ctx.fillRect(0, 380, textureWidth, 22);

  // 3. Dibujar banda inferior (402 a 512)
  ctx.fillStyle = bottomColor;
  ctx.fillRect(0, 402, textureWidth, 110);

  // 4. Dibujar líneas divisorias/bordes
  ctx.fillStyle = dividerColor;
  ctx.fillRect(0, 379, textureWidth, 1.5); // Línea arriba de la franja
  ctx.fillRect(0, 401, textureWidth, 1.5); // Línea abajo de la franja

  // 5. Agregar micro-ruido para dar textura de pintura/concreto real
  for (let i = 0; i < 2000; i++) {
    const nx = Math.random() * textureWidth;
    const ny = Math.random() * textureHeight;
    const nw = 1 + Math.random() * 1.5;
    const nh = 1 + Math.random() * 1.5;
    
    // Ruido blanco o negro muy translúcido
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(nx, ny, nw, nh);
  }

  dynamicTexture.update();

  // Configurar repetición/tiling
  dynamicTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  dynamicTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

  const mat = new BABYLON.StandardMaterial('paintedWallMaterial_' + Math.random().toString(36).substr(2, 5), scene);
  mat.diffuseTexture = dynamicTexture;
  mat.specularColor = BABYLON.Color3.Black(); // Mate, sin brillo especular
  mat.roughness = 0.95;

  return mat;
}
