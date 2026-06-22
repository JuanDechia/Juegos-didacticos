export class StartScreen {
  private container: HTMLDivElement | null = null;
  private onStartCallback: (() => void) | null = null;

  constructor(subject: string, lessonTitle: string, onStart: () => void) {
    this.onStartCallback = onStart;
    this.createScreen(subject, lessonTitle);
  }

  private createScreen(subject: string, lessonTitle: string): void {
    this.container = document.createElement('div');
    this.container.id = 'start-screen-container';
    this.container.className = 'screen-overlay-bg';

    this.container.innerHTML = `
      <div class="glass-panel interactive animate-scalein" style="
        width: min(520px, 90vw);
        text-align: center;
        padding: 3rem 3.5rem;
        border-color: rgba(0, 210, 255, 0.18);
        display: flex;
        flex-direction: column;
        gap: 2rem;
        box-shadow: 0 0 50px rgba(0, 210, 255, 0.12), 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
      ">
        <!-- Logo y Título -->
        <div>
          <div style="
            font-size: 3.5rem;
            margin-bottom: 0.5rem;
            filter: drop-shadow(0 0 12px rgba(0,210,255,0.4));
          ">🎮</div>
          <h1 style="
            font-size: 2.8rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--accent-blue) 0%, #a855f7 60%, var(--accent-blue) 100%);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 3px;
            margin-bottom: 0.4rem;
            animation: gradientShift 4s ease infinite;
          ">EDUARENA 3D</h1>
          <p style="
            color: var(--text-secondary);
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 4px;
            font-weight: 400;
          ">⚡ Zombie Quiz Edition</p>
        </div>

        <!-- Separador -->
        <div style="
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,210,255,0.3), transparent);
        "></div>

        <!-- Info de la Lección -->
        <div style="
          background: rgba(0, 210, 255, 0.04);
          border: 1px solid rgba(0, 210, 255, 0.12);
          border-radius: 12px;
          padding: 1.2rem 1.5rem;
          text-align: left;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          ">
            <span style="
              background: rgba(0, 210, 255, 0.15);
              color: var(--accent-blue);
              font-size: 0.7rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              padding: 3px 10px;
              border-radius: 20px;
              border: 1px solid rgba(0,210,255,0.2);
            ">${subject}</span>
          </div>
          <p style="
            color: var(--text-primary);
            font-size: 1.1rem;
            font-weight: 600;
            line-height: 1.4;
          ">${lessonTitle}</p>
        </div>

        <!-- Instrucciones -->
        <div style="text-align: left; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6;">
          <p style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.6rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Cómo jugar</p>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="color: var(--accent-blue); flex-shrink: 0;">📖</span>
              <span>Lee la pregunta en la pantalla frontal del nivel.</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="color: var(--accent-red); flex-shrink: 0;">🧟</span>
              <span><strong style="color: var(--accent-red)">Elimina</strong> los zombies con respuestas <strong>incorrectas</strong>.</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="color: var(--accent-green); flex-shrink: 0;">🛡️</span>
              <span><strong style="color: var(--accent-green)">Protege</strong> al zombie con la respuesta <strong>correcta</strong>.</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="flex-shrink: 0;">⌨️</span>
              <span>
                <kbd style="background:rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); font-family: monospace;">WASD</kbd>
                para moverte &nbsp;·&nbsp;
                <kbd style="background:rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); font-family: monospace;">R</kbd>
                para reiniciar
              </span>
            </div>
          </div>
        </div>

        <!-- Botón de inicio -->
        <button id="btn-start-game" class="btn-primary" style="width: 100%; font-size: 1.1rem; padding: 1rem;">
          ⚔️ &nbsp; INICIAR RETO
        </button>

        <p style="color: var(--text-secondary); font-size: 0.75rem; opacity: 0.6;">
          Haz clic en el botón y después en la pantalla para activar el modo combate
        </p>
      </div>
    `;

    document.body.appendChild(this.container);

    const startBtn = document.getElementById('btn-start-game');
    startBtn?.addEventListener('click', () => {
      this.start();
    });
  }

  private start(): void {
    if (this.onStartCallback) {
      this.onStartCallback();
    }
    this.dispose();
  }

  public dispose(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.onStartCallback = null;
  }
}
