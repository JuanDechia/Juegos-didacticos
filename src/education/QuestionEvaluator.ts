import type { Question, AnswerOption } from './types';

export class QuestionEvaluator {
  private question: Question;
  private correctOption: AnswerOption;

  constructor(question: Question) {
    this.question = question;
    
    const correct = question.options.find(opt => opt.isCorrect === true);
    if (!correct) {
      throw new Error(`La pregunta no contiene una opción correcta marcada.`);
    }
    this.correctOption = correct;
  }

  /**
   * Retorna la opción que es correcta.
   */
  public getCorrectOption(): AnswerOption {
    return this.correctOption;
  }

  /**
   * Determina si el ID de la opción suministrada es la correcta.
   */
  public isCorrectOption(optionId: string): boolean {
    return this.correctOption.id === optionId;
  }

  /**
   * Determina si el ID de la opción suministrada es incorrecto.
   */
  public isIncorrectOption(optionId: string): boolean {
    return !this.isCorrectOption(optionId);
  }

  /**
   * Obtiene la lista de IDs de todas las opciones incorrectas.
   */
  public getIncorrectOptionIds(): string[] {
    return this.question.options
      .filter(opt => opt.isCorrect !== true)
      .map(opt => opt.id);
  }
}
