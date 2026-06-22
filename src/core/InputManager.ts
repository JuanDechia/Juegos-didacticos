export class InputManager {
  private static instance: InputManager | null = null;
  
  private keys: Map<string, boolean> = new Map();
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private isPointerLocked = false;
  private canvas: HTMLCanvasElement | null = null;

  private onKeyDownBind: (e: KeyboardEvent) => void;
  private onKeyUpBind: (e: KeyboardEvent) => void;
  private onMouseMoveBind: (e: MouseEvent) => void;
  private onPointerLockChangeBind: () => void;

  private constructor() {
    this.onKeyDownBind = (e) => this.keys.set(e.key.toLowerCase(), true);
    this.onKeyUpBind = (e) => this.keys.set(e.key.toLowerCase(), false);
    this.onMouseMoveBind = (e) => {
      if (this.isPointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    };
    this.onPointerLockChangeBind = () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    };
  }

  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  /**
   * Inicializa el InputManager con el canvas para registrar los listener
   */
  public initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    window.addEventListener('keydown', this.onKeyDownBind);
    window.addEventListener('keyup', this.onKeyUpBind);
    window.addEventListener('mousemove', this.onMouseMoveBind);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBind);

    // Habilitar requestPointerLock al hacer click en el canvas
    this.canvas.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.canvas?.requestPointerLock();
      }
    });
  }

  /**
   * Determina si una tecla específica está actualmente pulsada
   */
  public isKeyPressed(key: string): boolean {
    return this.keys.get(key.toLowerCase()) === true;
  }

  /**
   * Retorna los deltas del mouse acumulados y los resetea para el próximo frame
   */
  public consumeMouseDeltas(): { x: number; y: number } {
    const deltas = { x: this.mouseDeltaX, y: this.mouseDeltaY };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return deltas;
  }

  /**
   * Retorna si el ratón tiene el puntero capturado
   */
  public isLocked(): boolean {
    return this.isPointerLocked;
  }

  /**
   * Libera y remueve los listeners de eventos
   */
  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDownBind);
    window.removeEventListener('keyup', this.onKeyUpBind);
    window.removeEventListener('mousemove', this.onMouseMoveBind);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBind);
    InputManager.instance = null;
  }
}
export const inputs = InputManager.getInstance();
