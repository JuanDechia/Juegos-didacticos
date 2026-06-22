export interface GameMode {
  start(): void;
  update(deltaSeconds: number): void;
  end(victory: boolean): void;
  dispose(): void;
}
