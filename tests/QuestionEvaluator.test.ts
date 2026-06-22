import { describe, it, expect } from 'vitest';
import { QuestionLoader } from '../src/education/QuestionLoader';
import { QuestionEvaluator } from '../src/education/QuestionEvaluator';

describe('QuestionLoader', () => {
  it('debe cargar correctamente una pregunta bien estructurada', () => {
    const validData = {
      id: 'geo-france-capital-001',
      subject: 'Geografía',
      lessonId: 'geo-france-basic',
      prompt: '¿Cuál es la capital de Francia?',
      type: 'single_choice',
      options: [
        { id: 'A', enemyLabel: 'A', boardText: 'A - Berlín', fullText: 'Berlín' },
        { id: 'B', enemyLabel: 'B', boardText: 'B - París', fullText: 'París', isCorrect: true },
        { id: 'C', enemyLabel: 'C', boardText: 'C - Brasilia', fullText: 'Brasilia' }
      ],
      explanation: 'París es la capital.',
      difficulty: 1
    };

    const question = QuestionLoader.loadFromObject(validData);
    expect(question.id).toBe('geo-france-capital-001');
    expect(question.options.length).toBe(3);
  });

  it('debe lanzar error si falta la opción correcta', () => {
    const invalidData = {
      id: 'geo-france-capital-001',
      subject: 'Geografía',
      lessonId: 'geo-france-basic',
      prompt: '¿Cuál es la capital de Francia?',
      type: 'single_choice',
      options: [
        { id: 'A', enemyLabel: 'A', boardText: 'A - Berlín', fullText: 'Berlín' },
        { id: 'C', enemyLabel: 'C', boardText: 'C - Brasilia', fullText: 'Brasilia' }
      ],
      explanation: 'París es la capital.',
      difficulty: 1
    };

    expect(() => QuestionLoader.loadFromObject(invalidData)).toThrowError(/no contiene ninguna respuesta correcta/);
  });

  it('debe lanzar error si la estructura del objeto es incompleta', () => {
    const incompleteData = {
      id: 'geo-france-capital-001'
    };

    expect(() => QuestionLoader.loadFromObject(incompleteData)).toThrow();
  });
});

describe('QuestionEvaluator', () => {
  const mockQuestion = {
    id: 'geo-france-capital-001',
    subject: 'Geografía',
    lessonId: 'geo-france-basic',
    prompt: '¿Cuál es la capital de Francia?',
    type: 'single_choice' as const,
    options: [
      { id: 'A', enemyLabel: 'A', boardText: 'A - Berlín', fullText: 'Berlín es la capital de Alemania.' },
      { id: 'B', enemyLabel: 'B', boardText: 'B - París', fullText: 'París es la capital de Francia.', isCorrect: true },
      { id: 'C', enemyLabel: 'C', boardText: 'C - Brasilia', fullText: 'Brasilia es la capital de Brasil.' },
      { id: 'D', enemyLabel: 'D', boardText: 'D - Roma', fullText: 'Roma es la capital de Italia.' }
    ],
    explanation: 'París es la capital de Francia.',
    difficulty: 1
  };

  it('debe identificar correctamente la respuesta correcta', () => {
    const evaluator = new QuestionEvaluator(mockQuestion);
    const correctOpt = evaluator.getCorrectOption();
    expect(correctOpt.id).toBe('B');
    expect(evaluator.isCorrectOption('B')).toBe(true);
    expect(evaluator.isCorrectOption('A')).toBe(false);
  });

  it('debe identificar las respuestas incorrectas', () => {
    const evaluator = new QuestionEvaluator(mockQuestion);
    expect(evaluator.isIncorrectOption('A')).toBe(true);
    expect(evaluator.isIncorrectOption('B')).toBe(false);
    expect(evaluator.getIncorrectOptionIds()).toEqual(['A', 'C', 'D']);
  });
});
