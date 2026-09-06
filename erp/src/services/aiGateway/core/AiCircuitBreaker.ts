import { AiCategory } from '../types/aiGatewayTypes';

interface CircuitState {
  isOpen: boolean;
  openedAt?: number;
  reason?: string;
  consecutiveErrors: number;
  recentTimestamps: number[];
}

export class AiCircuitBreaker {
  private static globalState: CircuitState = {
    isOpen: false,
    consecutiveErrors: 0,
    recentTimestamps: []
  };

  private static categoryStates: Record<AiCategory, CircuitState> = {
    TEXT: { isOpen: false, consecutiveErrors: 0, recentTimestamps: [] },
    IMAGE: { isOpen: false, consecutiveErrors: 0, recentTimestamps: [] },
    TTS: { isOpen: false, consecutiveErrors: 0, recentTimestamps: [] }
  };

  private static COOLDOWN_MS = 120000; // 2 minutos de isolamento ao abrir o circuit breaker
  private static MAX_BURST_PER_10S = 6;
  private static MAX_CONSECUTIVE_ERRORS = 4;

  public static check(category: AiCategory): { isOpen: boolean; reason?: string } {
    const now = Date.now();

    // Checar Cooldown Global
    if (this.globalState.isOpen) {
      if (this.globalState.openedAt && now - this.globalState.openedAt < this.COOLDOWN_MS) {
        return {
          isOpen: true,
          reason: `Circuit Breaker Global Ativo: ${this.globalState.reason}. Cooldown de 2 minutos.`
        };
      }
      this.resetGlobal();
    }

    // Checar Cooldown Categoria
    const catState = this.categoryStates[category];
    if (catState.isOpen) {
      if (catState.openedAt && now - catState.openedAt < this.COOLDOWN_MS) {
        return {
          isOpen: true,
          reason: `Circuit Breaker para ${category} Ativo: ${catState.reason}. Cooldown de 2 minutos.`
        };
      }
      this.resetCategory(category);
    }

    return { isOpen: false };
  }

  public static recordSuccess(category: AiCategory): void {
    this.globalState.consecutiveErrors = 0;
    this.categoryStates[category].consecutiveErrors = 0;
    this.trackBurst(category);
  }

  public static recordError(category: AiCategory, errorMessage: string): void {
    const now = Date.now();
    this.globalState.consecutiveErrors++;
    this.categoryStates[category].consecutiveErrors++;

    if (this.categoryStates[category].consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      this.categoryStates[category].isOpen = true;
      this.categoryStates[category].openedAt = now;
      this.categoryStates[category].reason = `Sequência excessiva de ${this.MAX_CONSECUTIVE_ERRORS} erros em ${category}: ${errorMessage}`;
    }

    if (this.globalState.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS * 2) {
      this.globalState.isOpen = true;
      this.globalState.openedAt = now;
      this.globalState.reason = `Rajada global de erros detectada na IA. Proteção ativada.`;
    }
  }

  private static trackBurst(category: AiCategory): void {
    const now = Date.now();
    const globalRecent = this.globalState.recentTimestamps.filter(t => now - t < 10000);
    globalRecent.push(now);
    this.globalState.recentTimestamps = globalRecent;

    if (globalRecent.length > this.MAX_BURST_PER_10S) {
      this.globalState.isOpen = true;
      this.globalState.openedAt = now;
      this.globalState.reason = `Rajada anômala de mais de ${this.MAX_BURST_PER_10S} requisições em 10s.`;
    }
  }

  public static resetGlobal(): void {
    this.globalState = { isOpen: false, consecutiveErrors: 0, recentTimestamps: [] };
  }

  public static resetCategory(category: AiCategory): void {
    this.categoryStates[category] = { isOpen: false, consecutiveErrors: 0, recentTimestamps: [] };
  }

  public static isGlobalOpen(): boolean {
    return this.globalState.isOpen;
  }

  public static getGlobalReason(): string | undefined {
    return this.globalState.reason;
  }
}
