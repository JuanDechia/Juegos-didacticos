import type { PlayerRecord } from './RoundTypes';

const RECORD_KEY = 'zombie_quiz_record_v1';

const DEFAULT_RECORD: PlayerRecord = {
  bestRound: 0,
  bestScore: 0,
  bestMoney: 0,
  bestTimestamp: '',
};

/**
 * Gestiona el récord del jugador en localStorage.
 */
export class RecordManager {
  private record: PlayerRecord;

  constructor() {
    this.record = this.load();
  }

  private load(): PlayerRecord {
    try {
      const raw = localStorage.getItem(RECORD_KEY);
      if (raw) {
        return JSON.parse(raw) as PlayerRecord;
      }
    } catch {
      // Si hay algún error de parseo, devolvemos el default
    }
    return { ...DEFAULT_RECORD };
  }

  private save(): void {
    try {
      localStorage.setItem(RECORD_KEY, JSON.stringify(this.record));
    } catch {
      // Silencioso si localStorage no está disponible
    }
  }

  /** Devuelve el récord actual. */
  public getBestRecord(): PlayerRecord {
    return { ...this.record };
  }

  /**
   * Guarda el récord si el round alcanzado es mayor al actual.
   * @returns true si se actualizó el récord.
   */
  public saveIfBetter(roundsCompleted: number, score: number, money: number): boolean {
    if (roundsCompleted > this.record.bestRound) {
      this.record = {
        bestRound: roundsCompleted,
        bestScore: score,
        bestMoney: money,
        bestTimestamp: new Date().toISOString(),
      };
      this.save();
      return true;
    }
    return false;
  }

  /** Resetea completamente el récord (útil para debug). */
  public reset(): void {
    this.record = { ...DEFAULT_RECORD };
    this.save();
  }
}
