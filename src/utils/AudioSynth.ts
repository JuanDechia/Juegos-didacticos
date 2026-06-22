export class AudioSynth {
  private static ctx: AudioContext | null = null;

  private static getContext(): AudioContext {
    if (!AudioSynth.ctx) {
      AudioSynth.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Desbloquear audio si está suspendido (política del navegador)
    if (AudioSynth.ctx.state === 'suspended') {
      AudioSynth.ctx.resume();
    }
    return AudioSynth.ctx;
  }

  /**
   * Sonido de disparo (ruido blanco + onda senoidal descendente de tipo láser)
   */
  public static playShoot(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // 1. Oscilador para el disparo de tipo láser cian
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);

      // 2. Un poco de ruido blanco para el impacto de aire del arma
      const bufferSize = ctx.sampleRate * 0.05; // 50ms de ruido
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.05);
    } catch (e) {
      console.warn('Web Audio API no disponible o bloqueada:', e);
    }
  }

  /**
   * Sonido de eliminación correcta de opción incorrecta (tono agudo agradable, "ding!")
   */
  public static playCorrectHit(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // Nota C5
      osc1.frequency.setValueAtTime(659.25, now + 0.06); // Nota E5

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.50, now); // Nota C6 de armónico

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Sonido de error al disparar a la correcta (tono grave descendente, "buzzer")
   */
  public static playError(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130.81, now); // C3 grave
      osc.frequency.linearRampToValueAtTime(80, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      // Filtro para hacerlo áspero y metálico
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Fanfarria alegre de victoria
   */
  public static playVictory(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      const noteDuration = 0.12;

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        const startTime = now + index * noteDuration;
        const endTime = startTime + (index === notes.length - 1 ? 0.4 : noteDuration);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, endTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Melodía triste de derrota
   */
  public static playDefeat(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const notes = [311.13, 293.66, 277.18, 220.00]; // Eb4, D4, Db4, A3
      const noteDuration = 0.18;

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        const startTime = now + index * noteDuration;
        const endTime = startTime + 0.3;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, endTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime);
      });
    } catch (e) {
      console.warn(e);
    }
  }
}
