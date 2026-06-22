import type { Question } from '../education/types';
import type { RoundQuestion, RunState, PlayerRecord, RoundDifficulty } from './RoundTypes';
import { RecordManager } from './RecordManager';
import capitalsData from '../content/questionSets/capitals.rounds.json';

/**
 * Gestiona la progresión de rounds del run activo.
 * - Carga el dataset de capitales determinístico.
 * - Convierte RoundQuestion → Question para compatibilidad con el sistema existente.
 * - Expone la API de avance/derrota/récord.
 */
export class RoundManager {
  private rounds: RoundQuestion[];
  private runState: RunState;
  private recordManager: RecordManager;

  constructor() {
    this.rounds = (capitalsData as { rounds: RoundQuestion[] }).rounds;
    this.recordManager = new RecordManager();
    this.runState = {
      currentRoundIndex: 0,
      money: 0,
      score: 0,
      status: 'not_started',
    };
  }

  // ─── Control del run ───────────────────────────────────────────────────────

  public startNewRun(startingMoney = 100): void {
    this.runState = {
      currentRoundIndex: 0,
      money: startingMoney,
      score: 0,
      status: 'playing',
    };
  }

  public advanceToNextRound(): void {
    this.runState.currentRoundIndex++;
    this.runState.status = 'playing';
  }

  public loseRun(): void {
    this.runState.status = 'lost_run';
    // Guardar récord: el round alcanzado es el 1-based index actual
    this.recordManager.saveIfBetter(
      this.getCurrentRoundNumber(),
      this.runState.score,
      this.runState.money,
    );
  }

  // ─── Getters de estado ─────────────────────────────────────────────────────

  public getCurrentRound(): RoundQuestion {
    const index = this.runState.currentRoundIndex;
    if (index >= this.rounds.length) {
      // Si supera el total de preguntas, reutilizar la última
      return this.rounds[this.rounds.length - 1];
    }
    return this.rounds[index];
  }

  /**
   * Devuelve la pregunta actual adaptada al formato Question usado por el sistema existente.
   */
  public getCurrentQuestion(): Question {
    const round = this.getCurrentRound();
    return {
      id: `capital-round-${round.round}`,
      subject: 'Geografía',
      lessonId: `geo-capital-${round.country.toLowerCase().replace(/\s/g, '-')}`,
      prompt: round.prompt,
      type: 'single_choice',
      options: round.options,
      explanation: round.explanation,
      difficulty: round.difficultyTier,
    };
  }

  /** Número de round actual (1-based). */
  public getCurrentRoundNumber(): number {
    return this.runState.currentRoundIndex + 1;
  }

  public getTotalRounds(): number {
    return this.rounds.length;
  }

  public getRunState(): Readonly<RunState> {
    return { ...this.runState };
  }

  // ─── Dinero (para sincronización con MoneyManager) ────────────────────────

  public setMoney(amount: number): void {
    this.runState.money = amount;
  }

  public addScore(points: number): void {
    this.runState.score += points;
  }

  // ─── Récord ────────────────────────────────────────────────────────────────

  public getBestRecord(): PlayerRecord {
    return this.recordManager.getBestRecord();
  }

  public saveRecordIfNeeded(): boolean {
    return this.recordManager.saveIfBetter(
      this.getCurrentRoundNumber(),
      this.runState.score,
      this.runState.money,
    );
  }

  // ─── Dificultad por round ─────────────────────────────────────────────────

  public getRoundDifficulty(round?: number): RoundDifficulty {
    const r = round ?? this.getCurrentRoundNumber();
    return {
      zombieHealth: 100 + Math.floor((r - 1) / 5) * 15,
      zombieSpeed: 1.2 + Math.min(r * 0.035, 1.2),
      zombieDamage: 10 + Math.floor((r - 1) / 10) * 5,
      extraZombies: Math.floor((r - 1) / 3),
    };
  }
}
