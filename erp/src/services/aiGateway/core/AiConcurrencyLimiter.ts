import { AiCategory } from '../types/aiGatewayTypes';
import { AI_LIMITS } from '../config/aiLimitsConfig';

export class AiConcurrencyLimiter {
  private static globalActive = 0;
  private static categoryActive: Record<AiCategory, number> = {
    TEXT: 0,
    IMAGE: 0,
    TTS: 0
  };

  public static tryAcquire(category: AiCategory): { acquired: boolean; reason?: string } {
    const categoryConfig = AI_LIMITS.categories[category];
    const globalConfig = AI_LIMITS.global;

    if (this.globalActive >= globalConfig.concurrent) {
      return {
        acquired: false,
        reason: `Limite de concorrência global atingido (${this.globalActive}/${globalConfig.concurrent} requisições de IA ativas simultaneamente).`
      };
    }

    if (this.categoryActive[category] >= categoryConfig.concurrent) {
      return {
        acquired: false,
        reason: `Limite de concorrência para ${category} atingido (${this.categoryActive[category]}/${categoryConfig.concurrent} requisições ativas).`
      };
    }

    this.globalActive++;
    this.categoryActive[category]++;

    return { acquired: true };
  }

  public static release(category: AiCategory): void {
    if (this.globalActive > 0) this.globalActive--;
    if (this.categoryActive[category] > 0) this.categoryActive[category]--;
  }

  public static getActiveCount(category?: AiCategory): number {
    if (!category) return this.globalActive;
    return this.categoryActive[category] || 0;
  }

  public static reset(): void {
    this.globalActive = 0;
    this.categoryActive = { TEXT: 0, IMAGE: 0, TTS: 0 };
  }
}
