import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import type { Question } from '../education/types';

export class AnswerBoard {
  private anchorMesh: BABYLON.AbstractMesh;
  private texture: GUI.AdvancedDynamicTexture;

  // Elementos UI de la textura
  private mainContainer: GUI.StackPanel;
  
  // Elementos de la pantalla de pregunta
  private subjectText: GUI.TextBlock;
  private questionText: GUI.TextBlock;
  private optionsPanel: GUI.StackPanel;
  private optionBlocks: Map<string, { container: GUI.Rectangle; text: GUI.TextBlock }> = new Map();

  // Elementos de la pantalla de resultados
  private resultContainer: GUI.StackPanel | null = null;

  constructor(anchor: BABYLON.AbstractMesh) {
    this.anchorMesh = anchor;

    // Crear la textura dinámica 2D proyectada en el plano 3D (ajustando resolución a 1024x512 para legibilidad)
    this.texture = GUI.AdvancedDynamicTexture.CreateForMesh(
      this.anchorMesh,
      1024,
      512
    );

    // Contenedor Principal
    this.mainContainer = new GUI.StackPanel('mainContainer');
    this.mainContainer.width = '100%';
    this.mainContainer.height = '100%';
    this.mainContainer.background = 'rgba(10, 10, 18, 0.95)';
    this.texture.addControl(this.mainContainer);

    // 1. Cabecera (Materia)
    this.subjectText = new GUI.TextBlock('subjectText');
    this.subjectText.text = '';
    this.subjectText.color = '#00d2ff'; // Celeste neón
    this.subjectText.fontSize = 24;
    this.subjectText.fontFamily = 'Outfit, sans-serif';
    this.subjectText.fontWeight = 'bold';
    this.subjectText.height = '50px';
    this.subjectText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.mainContainer.addControl(this.subjectText);

    // 2. Pregunta
    this.questionText = new GUI.TextBlock('questionText');
    this.questionText.text = '';
    this.questionText.color = '#f8f9fa';
    this.questionText.fontSize = 32;
    this.questionText.fontFamily = 'Outfit, sans-serif';
    this.questionText.textWrapping = true;
    this.questionText.height = '120px';
    this.questionText.paddingLeft = '20px';
    this.questionText.paddingRight = '20px';
    this.mainContainer.addControl(this.questionText);

    // 3. Panel de Opciones (Contenedor horizontal o vertical de opciones)
    this.optionsPanel = new GUI.StackPanel('optionsPanel');
    this.optionsPanel.height = '300px';
    // Hacemos que se acomoden en vertical
    this.optionsPanel.isVertical = true;
    this.optionsPanel.spacing = 10;
    this.mainContainer.addControl(this.optionsPanel);
  }

  /**
   * Carga una pregunta y genera los paneles de opciones
   */
  public setQuestion(question: Question): void {
    this.subjectText.text = question.subject.toUpperCase();
    this.questionText.text = question.prompt;

    // Limpiar opciones anteriores
    this.optionsPanel.clearControls();
    this.optionBlocks.clear();

    // Crear un contenedor de 2x2 para las opciones (usando StackPanels anidados para mayor flexibilidad en Babylon GUI)
    const row1 = new GUI.StackPanel('row1');
    row1.isVertical = false;
    row1.height = '130px';
    row1.spacing = 20;
    this.optionsPanel.addControl(row1);

    const row2 = new GUI.StackPanel('row2');
    row2.isVertical = false;
    row2.height = '130px';
    row2.spacing = 20;
    this.optionsPanel.addControl(row2);

    question.options.forEach((option, index) => {
      // Crear tarjeta contenedor para la opción
      const card = new GUI.Rectangle(`card_${option.id}`);
      card.width = '460px';
      card.height = '110px';
      card.cornerRadius = 10;
      card.thickness = 2;
      card.color = 'rgba(255, 255, 255, 0.15)'; // Borde inicial sutil
      card.background = 'rgba(255, 255, 255, 0.05)';

      const text = new GUI.TextBlock(`text_${option.id}`);
      text.text = option.boardText;
      text.color = '#adb5bd';
      text.fontSize = 24;
      text.fontFamily = 'Outfit, sans-serif';
      text.textWrapping = true;
      text.paddingLeft = '15px';
      text.paddingRight = '15px';
      card.addControl(text);

      // Agregar a la fila correspondiente (0 y 1 en fila 1, 2 y 3 en fila 2)
      if (index < 2) {
        row1.addControl(card);
      } else {
        row2.addControl(card);
      }

      this.optionBlocks.set(option.id, { container: card, text });
    });
  }

  /**
   * Resalta visualmente una opción al apuntar con la mira del arma
   */
  public highlightOption(optionId: string | null): void {
    this.optionBlocks.forEach((block, id) => {
      if (id === optionId) {
        block.container.color = '#00d2ff'; // Borde celeste neón
        block.container.background = 'rgba(0, 210, 255, 0.1)';
        block.text.color = '#f8f9fa';
      } else {
        // Restaurar estado si no está eliminada
        if (!block.text.lineThrough) {
          block.container.color = 'rgba(255, 255, 255, 0.15)';
          block.container.background = 'rgba(255, 255, 255, 0.05)';
          block.text.color = '#adb5bd';
        }
      }
    });
  }

  /**
   * Marca una opción como eliminada (tachar el texto, fondo rojo oscuro/apagado)
   */
  public markOptionEliminated(optionId: string): void {
    const block = this.optionBlocks.get(optionId);
    if (block) {
      block.text.lineThrough = true;
      block.text.color = 'rgba(255, 51, 102, 0.5)'; // Rojo desvanecido
      block.container.color = 'rgba(255, 51, 102, 0.2)';
      block.container.background = 'rgba(255, 51, 102, 0.02)';
    }
  }

  /**
   * Muestra la pantalla final de resultados con la explicación educativa
   */
  public showResult(correctOptionId: string, explanation: string): void {
    // 1. Limpiar pantalla de pregunta
    this.subjectText.text = 'REVISIÓN EDUCATIVA';
    this.subjectText.color = '#9d4edd'; // Púrpura de resultado
    this.questionText.text = '';
    this.optionsPanel.clearControls();

    // 2. Crear panel de resultados si no existe
    if (this.resultContainer) {
      this.mainContainer.removeControl(this.resultContainer);
    }

    this.resultContainer = new GUI.StackPanel('resultContainer');
    this.resultContainer.height = '380px';
    this.resultContainer.isVertical = true;
    this.resultContainer.spacing = 15;
    this.mainContainer.addControl(this.resultContainer);

    // Texto de respuesta correcta
    const answerTitle = new GUI.TextBlock('answerTitle');
    answerTitle.text = `Respuesta Correcta: Opción ${correctOptionId}`;
    answerTitle.color = '#00f5d4'; // Verde neón
    answerTitle.fontSize = 28;
    answerTitle.fontWeight = 'bold';
    answerTitle.fontFamily = 'Outfit, sans-serif';
    answerTitle.height = '40px';
    this.resultContainer.addControl(answerTitle);

    // Recuadro para la explicación
    const explBox = new GUI.Rectangle('explBox');
    explBox.width = '900px';
    explBox.height = '240px';
    explBox.cornerRadius = 12;
    explBox.background = 'rgba(15, 15, 27, 0.8)';
    explBox.color = '#9d4edd';
    explBox.thickness = 1;
    this.resultContainer.addControl(explBox);

    const explText = new GUI.TextBlock('explText');
    explText.text = explanation;
    explText.color = '#f8f9fa';
    explText.fontSize = 22;
    explText.fontFamily = 'Outfit, sans-serif';
    explText.textWrapping = true;
    explText.paddingLeft = '20px';
    explText.paddingRight = '20px';
    explBox.addControl(explText);
  }

  /**
   * Limpia y destruye el tablero
   */
  public dispose(): void {
    this.texture.dispose();
  }
}
