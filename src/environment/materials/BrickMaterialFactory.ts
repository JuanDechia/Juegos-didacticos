import * as BABYLON from '@babylonjs/core';

export interface BrickWallMaterialOptions {
  baseColor?: string;
  mortarColor?: string;
  speckleColor?: string;
  brickWidth?: number;  // Visual width in canvas pixels
  brickHeight?: number; // Visual height in canvas pixels
}

/**
 * Crea un material de pared de ladrillos procedimental utilizando DynamicTexture.
 */
export function createBrickWallMaterial(
  scene: BABYLON.Scene,
  options?: BrickWallMaterialOptions
): BABYLON.StandardMaterial {
  const baseColor = options?.baseColor ?? '#993d3d'; // Rojo ladrillo clásico
  const mortarColor = options?.mortarColor ?? '#d1d1d1'; // Mortero gris claro
  const speckleColor = options?.speckleColor ?? '#7a3030'; // Detalles oscuros

  const textureWidth = 512;
  const textureHeight = 512;

  const dynamicTexture = new BABYLON.DynamicTexture(
    'brickWallTexture_' + Math.random().toString(36).substr(2, 5),
    { width: textureWidth, height: textureHeight },
    scene,
    true
  );

  const ctx = dynamicTexture.getContext();

  // Rellenar fondo (mortero)
  ctx.fillStyle = mortarColor;
  ctx.fillRect(0, 0, textureWidth, textureHeight);

  // Dimensiones de ladrillo en la textura
  const brickW = options?.brickWidth ?? 64;
  const brickH = options?.brickHeight ?? 32;

  const rows = Math.ceil(textureHeight / brickH);
  const cols = Math.ceil(textureWidth / brickW);

  for (let r = 0; r < rows; r++) {
    const isOdd = r % 2 !== 0;
    const xOffset = isOdd ? -brickW / 2 : 0;
    const y = r * brickH;

    // Loop de c de -1 a cols + 1 para que el wrapping sea perfectamente continuo
    for (let c = -1; c <= cols + 1; c++) {
      const x = c * brickW + xOffset;

      // Dibujar bloque de ladrillo dejando espacio para la sisa/mortero
      ctx.fillStyle = baseColor;
      ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);

      // Agregar imperfecciones y detalles procedimentales (ruido determinista)
      let noiseSeed = (r * 17 + c * 23) % 100;
      const rand = () => {
        const value = Math.sin(noiseSeed++) * 10000;
        return value - Math.floor(value);
      };

      ctx.fillStyle = speckleColor;
      // 3 puntitos/manchas por ladrillo
      for (let s = 0; s < 3; s++) {
        const sx = x + 4 + rand() * (brickW - 10);
        const sy = y + 4 + rand() * (brickH - 10);
        const sw = 1.5 + rand() * 2;
        const sh = 1.5 + rand() * 2;
        ctx.fillRect(sx, sy, sw, sh);
      }
    }
  }

  dynamicTexture.update();

  // Configurar repetición/tiling
  dynamicTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  dynamicTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

  const mat = new BABYLON.StandardMaterial('brickWallMaterial_' + Math.random().toString(36).substr(2, 5), scene);
  mat.diffuseTexture = dynamicTexture;
  mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Muy poco brillo especular (mate)
  mat.roughness = 0.9;
  
  return mat;
}
