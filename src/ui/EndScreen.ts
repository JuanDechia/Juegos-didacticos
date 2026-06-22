import type { GameResult } from '../education/types';

export class EndScreen {
  private container: HTMLDivElement | null = null;
  private onRestartCallback: (() => void) | null = null;

  constructor(
    result: GameResult,
    explanation: string,
    onRestart: () => void
  ) {
    this.onRestartCallback = onRestart;
    this.createScreen(result, explanation);
  }

  private createScreen(result: GameResult, explanation: string): void {
    this.container = document.createElement('div');
    this.container.id = 'end-screen-container';
    this.container.className = 'screen-overlay-bg';

    const isVictory = result.status === 'won';
    const accentColor = isVictory ? 'var(--accent-green)' : 'var(--accent-red)';
    const accentRgba = isVictory ? 'rgba(0, 245, 212, 0.15)' : 'rgba(255, 51, 102, 0.15)';
    const accentBorder = isVictory ? 'rgba(0, 245, 212, 0.25)' : 'rgba(255, 51, 102, 0.25)';
    const emoji = isVictory ? '🏆' : '💀';

    const elapsedSeconds = (result.elapsedMs / 1000).toFixed(1);
    const accuracy = result.accuracy !== undefined
      ? result.accuracy.toFixed(1)
      : ((result.hits / (result.shotsFired || 1)) * 100).toFixed(1);

    let defeatReasonText = '';
    if (!isVictory) {
      defeatReasonText = result.wronglyEliminatedCorrectOption
        ? '¡Eliminaste la respuesta correcta por accidente!'
        : 'Los zombies te alcanzaron y perdiste toda tu salud.';
    }

    this.container.innerHTML = `
      <div class="glass-panel interactive animate-scalein" style="
        width: min(580px, 92vw);
        text-align: center;
        padding: 3rem;
        border-color: ${accentBorder};
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        box-shadow: 0 0 60px ${accentRgba}, 0 30px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
      ">
        <!-- Ícono y Título principal -->
        <div>
          <div style="
            font-size: 4rem;
            margin-bottom: 0.5rem;
            filter: drop-shadow(0 0 16px ${accentColor});
            animation: heartbeat 1.2s ease-in-out ${isVictory ? 'infinite' : '1'};
          ">${emoji}</div>
          <h1 style="
            font-size: 2.8rem;
            font-weight: 800;
            color: ${accentColor};
            letter-spacing: 4px;
            margin-bottom: 0.4rem;
            text-shadow: 0 0 20px ${accentColor}, 0 0 40px ${accentColor};
          ">
            ${isVictory ? '¡VICTORIA!' : 'FIN DEL JUEGO'}
          </h1>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; max-width: 380px; margin: 0 auto;">
            ${isVictory
              ? 'Has protegido la respuesta correcta y eliminado todas las amenazas. ¡Excelente trabajo!'
              : defeatReasonText}
          </p>
        </div>

        <!-- Separador con color de acento -->
        <div style="
          height: 1px;
          background: linear-gradient(90deg, transparent, ${accentColor}, transparent);
          opacity: 0.4;
        "></div>

        <!-- Estadísticas -->
        <div style="
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        ">
          ${this.statBox('🎖️', String(result.roundReached ?? 1), 'Ronda')}
          ${this.statBox('👑', String(result.bestRound ?? 1), 'Récord')}
          ${this.statBox('⏱️', elapsedSeconds + 's', 'Tiempo')}
          ${this.statBox('💥', String(result.shotsFired), 'Disparos')}
          ${this.statBox('🎯', accuracy + '%', 'Precisión')}
        </div>

        <!-- Explicación Educativa -->
        <div style="
          text-align: left;
          background: rgba(15, 15, 27, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.2rem 1.5rem;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          ">
            <span style="font-size: 1rem;">📚</span>
            <span style="
              color: var(--accent-blue);
              font-weight: 700;
              font-size: 0.78rem;
              text-transform: uppercase;
              letter-spacing: 1.5px;
            ">Respuesta Correcta: Opción ${result.correctOptionId}</span>
          </div>
          <p style="color: var(--text-primary); font-size: 0.97rem; line-height: 1.6; opacity: 0.9;">
            ${explanation}
          </p>
        </div>

        <!-- Acciones -->
        <div style="display: flex; gap: 12px; flex-direction: column;">
          <button id="btn-restart-game" class="btn-primary" style="width: 100%; font-size: 1.05rem; padding: 1rem;">
            🔄 &nbsp; JUGAR OTRA VEZ
          </button>
          <p style="color: var(--text-secondary); font-size: 0.75rem; opacity: 0.5;">
            También puedes presionar <kbd style="background:rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">R</kbd> para reiniciar
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    const restartBtn = document.getElementById('btn-restart-game');
    restartBtn?.addEventListener('click', () => {
      this.restart();
    });
  }

  /** Helper para construir cajas de estadísticas */
  private statBox(icon: string, value: string, label: string): string {
    return `
      <div style="
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 1rem 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      ">
        <span style="font-size: 1.3rem;">${icon}</span>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); font-variant-numeric: tabular-nums;">${value}</div>
        <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
      </div>
    `;
  }

  private restart(): void {
    if (this.onRestartCallback) {
      this.onRestartCallback();
    }
    this.dispose();
  }

  public dispose(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.onRestartCallback = null;
  }
}

// Extender GameResult con propiedades adicionales para v0.2
declare module '../education/types' {
  interface GameResult {
    accuracy?: number;
    roundReached?: number;
    bestRound?: number;
  }
}
