export type QuestionType = 'single_choice';

export interface AnswerOption {
  id: string;
  enemyLabel: string;
  boardText: string;
  fullText: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  subject: string;
  lessonId: string;
  prompt: string;
  type: QuestionType;
  options: AnswerOption[];
  explanation: string;
  difficulty: number;
}

export interface GameResult {
  questionId: string;
  status: 'won' | 'lost';
  correctOptionId: string;
  eliminatedOptionIds: string[];
  wronglyEliminatedCorrectOption: boolean;
  elapsedMs: number;
  shotsFired: number;
  hits: number;
}

export interface GameConfig {
  strictCorrectKillGameOver: boolean;
  playerHealth: number;
  enemyDamage: number;
  enemySpeed: number;
  weaponCooldownMs: number;
  maxGameTimeMs?: number;
}
