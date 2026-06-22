import type { AnswerOption } from '../education/types';

// ─── Tipos de preguntas por round ───────────────────────────────────────────

export interface RoundQuestion {
  round: number;
  difficultyTier: number;
  country: string;
  capital: string;
  prompt: string;
  options: AnswerOption[];
  explanation: string;
}

// ─── Estado del run activo ───────────────────────────────────────────────────

export type RunStatus = 'not_started' | 'playing' | 'won_round' | 'lost_run';

export interface RunState {
  currentRoundIndex: number;
  money: number;
  score: number;
  status: RunStatus;
}

// ─── Récord del jugador ──────────────────────────────────────────────────────

export interface PlayerRecord {
  bestRound: number;
  bestScore: number;
  bestMoney: number;
  bestTimestamp: string;
}

// ─── Resultado al finalizar un run ──────────────────────────────────────────

export interface RunResult {
  roundsCompleted: number;
  finalScore: number;
  finalMoney: number;
}

// ─── Dificultad calculada por round ─────────────────────────────────────────

export interface RoundDifficulty {
  zombieHealth: number;
  zombieSpeed: number;
  zombieDamage: number;
  extraZombies: number;
}
