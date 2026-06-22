import * as BABYLON from '@babylonjs/core';

export type MoneyReason = 'standard_kill' | 'one_shot_headshot' | 'round_bonus' | 'purchase';

export interface MoneyEvent {
  amount: number;
  reason: MoneyReason;
  timestamp: number;
}

/**
 * Gestiona la economía del jugador durante un run.
 * Emite eventos cuando el dinero cambia para actualizar el HUD.
 */
export class MoneyManager {
  private money: number;
  private readonly initialMoney: number;

  /** Emite el nuevo total cada vez que cambia el dinero. */
  public readonly onMoneyChanged: BABYLON.Observable<number> = new BABYLON.Observable();

  constructor(initialMoney = 100) {
    this.initialMoney = initialMoney;
    this.money = initialMoney;
  }

  public getMoney(): number {
    return this.money;
  }

  public canAfford(amount: number): boolean {
    return this.money >= amount;
  }

  public addMoney(amount: number, _reason: MoneyReason = 'round_bonus'): void {
    if (amount <= 0) return;
    this.money += amount;
    this.onMoneyChanged.notifyObservers(this.money);
  }

  /**
   * Intenta gastar dinero.
   * @returns true si la operación fue exitosa, false si no hay fondos suficientes.
   */
  public spendMoney(amount: number, _reason: MoneyReason = 'purchase'): boolean {
    if (!this.canAfford(amount)) return false;
    this.money -= amount;
    this.onMoneyChanged.notifyObservers(this.money);
    return true;
  }

  /** Resetea el dinero al valor inicial (inicio de nuevo run). */
  public reset(): void {
    this.money = this.initialMoney;
    this.onMoneyChanged.notifyObservers(this.money);
  }

  public dispose(): void {
    this.onMoneyChanged.clear();
  }
}
