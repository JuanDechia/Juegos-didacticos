import './style.css';
import { GameApp } from './GameApp';

// Inicializar la aplicación cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  // Guardar en window para facilitar debugging e inspección
  (window as any).gameApp = app;
});

