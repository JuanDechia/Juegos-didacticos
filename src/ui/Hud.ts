export class Hud {
  private container: HTMLDivElement | null = null;
  private healthFill: HTMLDivElement | null = null;
  private healthText: HTMLSpanElement | null = null;
  private objectiveText: HTMLDivElement | null = null;
  private progressText: HTMLDivElement | null = null;
  private lockWarning: HTMLDivElement | null = null;
  private crosshairDot: HTMLDivElement | null = null;
  private damageOverlay: HTMLDivElement | null = null;
  private killFeedContainer: HTMLDivElement | null = null;

  // Nuevas referencias v0.2
  private roundValue: HTMLSpanElement | null = null;
  private moneyValue: HTMLSpanElement | null = null;
  private weaponName: HTMLSpanElement | null = null;
  private weaponMag: HTMLSpanElement | null = null;
  private weaponReserve: HTMLSpanElement | null = null;
  private reloadIndicator: HTMLDivElement | null = null;
  private buyPrompt: HTMLDivElement | null = null;

  constructor() {
    this.createDamageOverlay();
    this.createHudElements();
    this.setupPointerLockListeners();
  }

  /** Crea el overlay de pantalla roja al recibir daño */
  private createDamageOverlay(): void {
    this.damageOverlay = document.createElement('div');
    this.damageOverlay.id = 'damage-overlay';
    document.body.appendChild(this.damageOverlay);
  }

  private createHudElements(): void {
    this.container = document.createElement('div');
    this.container.id = 'hud-container';
    this.container.className = 'ui-overlay';
    document.body.appendChild(this.container);

    this.container.innerHTML = `
      <!-- Cabecera del HUD: Objetivo y Estadísticas -->
      <div class="hud-header" style="display: flex; justify-content: space-between; width: 100%; pointer-events: none; gap: 1rem;">
        <div id="hud-objective" class="glass-panel animate-slideup" style="
          font-weight: 600;
          font-size: 1rem;
          border-left: 3px solid var(--accent-blue);
          padding: 0.75rem 1.2rem;
          max-width: 60%;
          line-height: 1.4;
          animation-delay: 0.05s;
        ">
          <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px;">Objetivo</span>
          Cargando pregunta...
        </div>

        <div class="hud-stats-group" style="display: flex; gap: 0.75rem; align-items: flex-start;">
          <!-- Panel de Dinero -->
          <div id="hud-money-panel" class="glass-panel animate-slideup" style="
            font-weight: 700;
            font-size: 1.1rem;
            border-left: 3px solid var(--accent-green);
            padding: 0.75rem 1.2rem;
            white-space: nowrap;
            display: flex;
            flex-direction: column;
            gap: 2px;
            animation-delay: 0.08s;
            box-shadow: 0 0 10px rgba(0, 245, 212, 0.15);
          ">
            <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">Fondos</span>
            <span id="hud-money-value" style="color: var(--accent-green); font-family: monospace; font-size: 1.2rem; text-shadow: 0 0 8px rgba(0,245,212,0.4);">$100</span>
          </div>

          <!-- Panel de Progreso -->
          <div id="hud-progress" class="glass-panel animate-slideup" style="
            font-weight: 700;
            font-size: 1.1rem;
            border-left: 3px solid var(--accent-purple);
            padding: 0.75rem 1.2rem;
            white-space: nowrap;
            display: flex;
            flex-direction: column;
            gap: 2px;
            animation-delay: 0.1s;
          ">
            <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">Eliminadas</span>
            <span id="hud-progress-value">0 / 3</span>
          </div>

          <!-- Panel de Ronda -->
          <div id="hud-round-panel" class="glass-panel animate-slideup" style="
            font-weight: 700;
            font-size: 1.1rem;
            border-left: 3px solid var(--accent-blue);
            padding: 0.75rem 1.2rem;
            white-space: nowrap;
            display: flex;
            flex-direction: column;
            gap: 2px;
            animation-delay: 0.12s;
          ">
            <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">Ronda</span>
            <span id="hud-round-value" style="color: var(--accent-blue); text-shadow: 0 0 8px rgba(0,210,255,0.4);">R1 <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal;">(Record: 1)</span></span>
          </div>
        </div>
      </div>

      <!-- Crosshair en el centro absoluto -->
      <div id="hud-crosshair" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 5;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 15px;
      ">
        <!-- Buy Prompt -->
        <div id="hud-buy-prompt" class="glass-panel" style="
          display: none;
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--accent-green);
          border: 1px solid rgba(0, 245, 212, 0.35);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          box-shadow: 0 0 15px rgba(0, 245, 212, 0.25);
          animation: criticalBlink 1.2s ease infinite;
          white-space: nowrap;
          pointer-events: none;
        ">
          Press E to buy
        </div>

        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <!-- Línea horizontal izquierda -->
          <div style="position: absolute; left: 0; top: 50%; width: 8px; height: 1.5px; background: rgba(255,255,255,0.75); transform: translateY(-50%); box-shadow: 0 0 4px rgba(0,210,255,0.5);"></div>
          <!-- Línea horizontal derecha -->
          <div style="position: absolute; right: 0; top: 50%; width: 8px; height: 1.5px; background: rgba(255,255,255,0.75); transform: translateY(-50%); box-shadow: 0 0 4px rgba(0,210,255,0.5);"></div>
          <!-- Línea vertical superior -->
          <div style="position: absolute; top: 0; left: 50%; width: 1.5px; height: 8px; background: rgba(255,255,255,0.75); transform: translateX(-50%); box-shadow: 0 0 4px rgba(0,210,255,0.5);"></div>
          <!-- Línea vertical inferior -->
          <div style="position: absolute; bottom: 0; left: 50%; width: 1.5px; height: 8px; background: rgba(255,255,255,0.75); transform: translateX(-50%); box-shadow: 0 0 4px rgba(0,210,255,0.5);"></div>
          <!-- Punto central -->
          <div id="hud-crosshair-dot" style="
            width: 4px;
            height: 4px;
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            box-shadow: 0 0 6px rgba(0, 210, 255, 0.8);
            transition: transform 0.1s ease, background-color 0.1s ease, box-shadow 0.1s ease;
          "></div>
        </div>

        <!-- Reload Indicator -->
        <div id="hud-reload-indicator" class="glass-panel" style="
          display: none;
          font-weight: 800;
          font-size: 0.85rem;
          color: var(--accent-red);
          border: 1px solid rgba(255, 51, 102, 0.35);
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          box-shadow: 0 0 15px rgba(255, 51, 102, 0.25);
          animation: criticalBlink 0.6s ease infinite;
          white-space: nowrap;
          letter-spacing: 1.5px;
          pointer-events: none;
        ">
          RECARGANDO...
        </div>
      </div>

      <!-- Kill Feed (notificaciones de eliminación) -->
      <div id="hud-killfeed" style="
        position: absolute;
        right: 1.5rem;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 6px;
        pointer-events: none;
        z-index: 15;
        min-width: 200px;
      "></div>

      <!-- Advertencia de Bloqueo de Puntero -->
      <div id="hud-lock-warning" class="glass-panel interactive" style="
        position: absolute;
        top: 42%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        padding: 2rem 3rem;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        border-color: rgba(0, 210, 255, 0.25);
        box-shadow: 0 0 30px rgba(0, 210, 255, 0.1), 0 8px 32px rgba(0,0,0,0.5);
        animation: neonPulse 2.5s ease-in-out infinite;
      ">
        <div style="font-size: 2rem; margin-bottom: 4px;">🎯</div>
        <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--accent-blue); letter-spacing: 2px; text-shadow: 0 0 10px rgba(0,210,255,0.5);">MODO COMBATE</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; max-width: 260px;">Haz clic para activar la mira y comenzar a moverte.</p>
        <div style="
          display: flex;
          gap: 8px;
          margin-top: 4px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        ">
          <kbd style="background:rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.12);">W A S D</kbd>
          <span>mover</span>
          <kbd style="background:rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.12);">🖱️ Clic</kbd>
          <span>disparar</span>
        </div>
      </div>

      <!-- Pie del HUD: Barra de Salud y Arma -->
      <div class="hud-footer animate-slideup" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        pointer-events: none;
        animation-delay: 0.15s;
      ">
        <!-- Salud (Izquierda) -->
        <div class="glass-panel" style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.7rem 1.2rem;
          min-width: 280px;
        ">
          <span style="
            font-weight: 800;
            font-size: 0.75rem;
            letter-spacing: 2px;
            color: var(--text-secondary);
            text-transform: uppercase;
          ">HP</span>
          <div style="flex-grow: 1; height: 10px; background: rgba(255, 255, 255, 0.07); border-radius: 99px; overflow: visible; border: 1px solid rgba(255,255,255,0.04); position: relative;">
            <div id="hud-health-fill" style="
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, var(--accent-green) 0%, #00b4d8 100%);
              border-radius: 99px;
              transition: width 0.4s cubic-bezier(0.1, 0.8, 0.3, 1), background 0.5s ease;
              box-shadow: 0 0 8px rgba(0, 245, 212, 0.5);
            "></div>
          </div>
          <span id="hud-health-text" style="
            font-weight: 800;
            font-size: 1.1rem;
            width: 38px;
            text-align: right;
            transition: color 0.3s ease;
            font-variant-numeric: tabular-nums;
          ">100</span>
        </div>

        <!-- Arma y Munición (Derecha) -->
        <div id="hud-weapon-panel" class="glass-panel" style="
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0.7rem 1.2rem;
          min-width: 200px;
          justify-content: flex-end;
          border-right: 3px solid var(--accent-blue);
        ">
          <div style="text-align: right; display: flex; flex-direction: column; gap: 2px;">
            <span id="hud-weapon-name" style="
              font-weight: 800;
              font-size: 0.95rem;
              letter-spacing: 1px;
              color: var(--text-primary);
              text-transform: uppercase;
            ">Pistola</span>
            <span style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Equipado</span>
          </div>
          <div style="
            font-family: monospace;
            font-size: 1.3rem;
            font-weight: 800;
            color: var(--accent-blue);
            text-shadow: 0 0 8px rgba(0, 210, 255, 0.4);
            white-space: nowrap;
          ">
            <span id="hud-weapon-mag">8</span>
            <span style="color: var(--text-secondary); font-weight: 400; font-size: 0.95rem; margin: 0 2px;">/</span>
            <span id="hud-weapon-reserve" style="color: var(--text-secondary); font-size: 1rem;">40</span>
          </div>
        </div>
      </div>
    `;

    // Referencias DOM
    this.healthFill = document.getElementById('hud-health-fill') as HTMLDivElement;
    this.healthText = document.getElementById('hud-health-text') as HTMLSpanElement;
    this.objectiveText = document.getElementById('hud-objective') as HTMLDivElement;
    this.progressText = document.getElementById('hud-progress-value') as HTMLDivElement;
    this.lockWarning = document.getElementById('hud-lock-warning') as HTMLDivElement;
    this.crosshairDot = document.getElementById('hud-crosshair-dot') as HTMLDivElement;
    this.killFeedContainer = document.getElementById('hud-killfeed') as HTMLDivElement;

    // Referencias DOM v0.2
    this.roundValue = document.getElementById('hud-round-value') as HTMLSpanElement;
    this.moneyValue = document.getElementById('hud-money-value') as HTMLSpanElement;
    this.weaponName = document.getElementById('hud-weapon-name') as HTMLSpanElement;
    this.weaponMag = document.getElementById('hud-weapon-mag') as HTMLSpanElement;
    this.weaponReserve = document.getElementById('hud-weapon-reserve') as HTMLSpanElement;
    this.reloadIndicator = document.getElementById('hud-reload-indicator') as HTMLDivElement;
    this.buyPrompt = document.getElementById('hud-buy-prompt') as HTMLDivElement;
  }

  private setupPointerLockListeners(): void {
    this.lockWarning?.addEventListener('click', () => {
      document.getElementById('renderCanvas')?.requestPointerLock();
    });

    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === document.getElementById('renderCanvas');
      if (this.lockWarning) {
        this.lockWarning.style.display = isLocked ? 'none' : 'flex';
      }
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
  }

  /**
   * Actualiza la barra de salud con animación y colores dinámicos
   */
  public updateHealth(current: number, max: number): void {
    if (!this.healthFill || !this.healthText) return;

    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    this.healthFill.style.width = `${percentage}%`;
    this.healthText.textContent = `${Math.ceil(current)}`;

    if (percentage > 60) {
      this.healthFill.style.background = 'linear-gradient(90deg, var(--accent-green) 0%, #00b4d8 100%)';
      this.healthFill.style.boxShadow = '0 0 8px rgba(0, 245, 212, 0.5)';
      this.healthText.style.color = 'var(--text-primary)';
    } else if (percentage > 30) {
      this.healthFill.style.background = 'linear-gradient(90deg, #ffb703 0%, #fb8500 100%)';
      this.healthFill.style.boxShadow = '0 0 8px rgba(255, 183, 3, 0.5)';
      this.healthText.style.color = '#ffb703';
    } else {
      this.healthFill.style.background = 'linear-gradient(90deg, var(--accent-red) 0%, #d90429 100%)';
      this.healthFill.style.boxShadow = '0 0 12px rgba(255, 51, 102, 0.7)';
      this.healthText.style.color = 'var(--accent-red)';
      // Animación de latido en bajo nivel
      this.healthText.style.animation = 'heartbeat 0.8s ease-in-out infinite';
    }

    if (percentage > 30 && this.healthText.style.animation) {
      this.healthText.style.animation = '';
    }
  }

  /**
   * Efecto visual de daño: overlay rojo + shake del HUD de salud
   */
  public flashDamage(): void {
    if (!this.damageOverlay) return;
    this.damageOverlay.classList.remove('flash');
    // Forzar reflow para reiniciar animación
    void this.damageOverlay.offsetWidth;
    this.damageOverlay.classList.add('flash');

    // Quitar clase tras la animación
    setTimeout(() => {
      this.damageOverlay?.classList.remove('flash');
    }, 550);
  }

  /**
   * Actualiza el texto del objetivo educativo
   */
  public updateObjective(prompt: string, correctLetter: string): void {
    if (this.objectiveText) {
      this.objectiveText.innerHTML = `
        <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Pregunta</span>
        <span style="color: #fff; font-weight: 600;">${prompt}</span>
        &nbsp;&nbsp;<span style="color: var(--text-secondary);">•</span>&nbsp;&nbsp;
        Protege a <span style="color: var(--accent-green); font-weight: 800; text-shadow: 0 0 8px rgba(0,245,212,0.5);">${correctLetter}</span>
      `;
    }
  }

  /**
   * Actualiza el progreso de incorrectas eliminadas con animación
   */
  public updateProgress(eliminated: number, total: number): void {
    if (!this.progressText) return;

    const progressEl = document.getElementById('hud-progress');
    this.progressText.textContent = `${eliminated} / ${total}`;

    if (eliminated === total) {
      if (progressEl) progressEl.style.borderColor = 'var(--accent-green)';
      this.progressText.style.color = 'var(--accent-green)';
      this.progressText.style.textShadow = '0 0 8px rgba(0, 245, 212, 0.5)';
    } else if (eliminated > 0) {
      if (progressEl) progressEl.style.borderColor = 'var(--accent-blue)';
      this.progressText.style.color = 'var(--accent-blue)';
      this.progressText.style.textShadow = 'none';
    } else {
      if (progressEl) progressEl.style.borderColor = 'var(--accent-purple)';
      this.progressText.style.color = 'var(--text-primary)';
      this.progressText.style.textShadow = 'none';
    }
  }

  /**
   * Muestra una notificación de eliminación en el kill feed
   */
  public showKillFeed(text: string, isCorrect: boolean): void {
    if (!this.killFeedContainer) return;

    const entry = document.createElement('div');
    entry.style.cssText = `
      background: rgba(15, 15, 27, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid ${isCorrect ? 'rgba(0, 245, 212, 0.4)' : 'rgba(255, 51, 102, 0.4)'};
      border-radius: 10px;
      padding: 6px 14px;
      font-size: 0.85rem;
      font-weight: 600;
      color: ${isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'};
      text-shadow: ${isCorrect ? '0 0 6px rgba(0,245,212,0.4)' : '0 0 6px rgba(255,51,102,0.4)'};
      animation: slideUpFade 0.3s ease forwards;
      transition: opacity 0.4s ease;
      white-space: nowrap;
    `;
    entry.textContent = text;
    this.killFeedContainer.appendChild(entry);

    // Auto-remover tras 2.5 segundos
    setTimeout(() => {
      entry.style.opacity = '0';
      setTimeout(() => entry.remove(), 400);
    }, 2500);
  }

  /**
   * Cambia el estado del crosshair (apuntando a enemigo o no)
   */
  public setCrosshairAimed(aimed: boolean): void {
    if (!this.crosshairDot) return;
    if (aimed) {
      this.crosshairDot.style.backgroundColor = 'var(--accent-red)';
      this.crosshairDot.style.boxShadow = '0 0 8px rgba(255, 51, 102, 0.9), 0 0 16px rgba(255,51,102,0.4)';
      this.crosshairDot.style.transform = 'scale(1.5)';
    } else {
      this.crosshairDot.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      this.crosshairDot.style.boxShadow = '0 0 6px rgba(0, 210, 255, 0.8)';
      this.crosshairDot.style.transform = 'scale(1)';
    }
  }

  public setVisible(visible: boolean): void {
    if (this.container) {
      this.container.style.display = visible ? 'flex' : 'none';
    }
  }

  public updateRound(current: number, best: number): void {
    if (this.roundValue) {
      this.roundValue.innerHTML = `R${current} <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal;">(Record: ${best})</span>`;
    }
  }

  public updateMoney(amount: number): void {
    if (this.moneyValue) {
      this.moneyValue.textContent = `$${amount}`;
    }
  }

  public updateWeapon(name: string, mag: number, reserve: number): void {
    if (this.weaponName) this.weaponName.textContent = name;
    if (this.weaponMag) this.weaponMag.textContent = mag.toString();
    if (this.weaponReserve) this.weaponReserve.textContent = reserve.toString();
  }

  public showReloadIndicator(visible: boolean): void {
    if (this.reloadIndicator) {
      this.reloadIndicator.style.display = visible ? 'block' : 'none';
    }
  }

  public showBuyPrompt(text: string): void {
    if (this.buyPrompt) {
      this.buyPrompt.textContent = text;
      this.buyPrompt.style.display = 'block';
    }
  }

  public hideBuyPrompt(): void {
    if (this.buyPrompt) {
      this.buyPrompt.style.display = 'none';
    }
  }

  public dispose(): void {
    if (this.damageOverlay) {
      this.damageOverlay.remove();
      this.damageOverlay = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
