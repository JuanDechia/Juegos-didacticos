import type { Question } from './types';

export class QuestionLoader {
  /**
   * Valida y parsea un objeto de pregunta desde JSON.
   * Lanza un error si la estructura es inválida.
   */
  public static loadFromObject(data: any): Question {
    if (!data) {
      throw new Error('Los datos de la pregunta están vacíos.');
    }

    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Falta el ID de la pregunta o no es un string.');
    }

    if (!data.prompt || typeof data.prompt !== 'string') {
      throw new Error('Falta el prompt de la pregunta o no es un string.');
    }

    if (data.type !== 'single_choice') {
      throw new Error(`Tipo de pregunta no soportado: ${data.type}`);
    }

    if (!Array.isArray(data.options) || data.options.length === 0) {
      throw new Error('La pregunta debe tener una lista de opciones válida.');
    }

    let hasCorrect = false;
    for (const option of data.options) {
      if (!option.id || typeof option.id !== 'string') {
        throw new Error('Una de las opciones no tiene un ID válido.');
      }
      if (!option.enemyLabel || typeof option.enemyLabel !== 'string') {
        throw new Error(`La opción ${option.id} no tiene un enemyLabel válido.`);
      }
      if (!option.boardText || typeof option.boardText !== 'string') {
        throw new Error(`La opción ${option.id} no tiene un boardText válido.`);
      }
      if (option.isCorrect === true) {
        hasCorrect = true;
      }
    }

    if (!hasCorrect) {
      throw new Error(`La pregunta con ID ${data.id} no contiene ninguna respuesta correcta (isCorrect: true).`);
    }

    return data as Question;
  }
}
