import { AiCategory } from '../types/aiGatewayTypes';
import { AI_LIMITS } from '../config/aiLimitsConfig';

export class AiConcurrencyLimiter {
  private static globalActive = 0;
  private static categoryActive: Record<AiCategory, number> = {
    TEXT: 0,
    IMAGE: 0,
  };
  private static operationActive: Record<string, number> = {};

  public static tryAcquire(
    category: AiCategory,
    operationKey?: string,
    operationLimit?: number
  ): { acquired: boolean; reason?: string } {
    const categoryConfig = AI_LIMITS.categories[category];
    const globalConfig = AI_LIMITS.global;
    const scopedOperationKey = operationKey ? `${category}:${operationKey}` : undefined;

    if (
      scopedOperationKey &&
      operationLimit !== undefined &&
      (this.operationActive[scopedOperationKey] || 0) >= operationLimit
    ) {
      return {
        acquired: false,
        reason: `Limite de concorrência da operação ${operationKey} atingido (${this.operationActive[scopedOperationKey]}/${operationLimit} requisições ativas).`,
      };
    }

    if (this.globalActive >= globalConfig.concurrent) {
      return {
        acquired: false,
        reason: `Limite de concorrência global atingido (${this.globalActive}/${globalConfig.concurrent} requisições de IA ativas simultaneamente).`,
      };
    }

    if (this.categoryActive[category] >= categoryConfig.concurrent) {
      return {
        acquired: false,
        reason: `Limite de concorrência para ${category} atingido (${this.categoryActive[category]}/${categoryConfig.concurrent} requisições ativas).`,
      };
    }

    this.globalActive++;
    this.categoryActive[category]++;
    if (scopedOperationKey) {
      this.operationActive[scopedOperationKey] = (this.operationActive[scopedOperationKey] || 0) + 1;
    }

    return { acquired: true };
  }

  public static release(category: AiCategory, operationKey?: string): void {
    if (this.globalActive > 0) this.globalActive--;
    if (this.categoryActive[category] > 0) this.categoryActive[category]--;
    if (operationKey) {
      const scopedOperationKey = `${category}:${operationKey}`;
      const active = this.operationActive[scopedOperationKey] || 0;
      if (active <= 1) {
        delete this.operationActive[scopedOperationKey];
      } else {
        this.operationActive[scopedOperationKey] = active - 1;
      }
    }
  }

  public static getActiveCount(category?: AiCategory): number {
    if (!category) return this.globalActive;
    return this.categoryActive[category] || 0;
  }

  public static reset(): void {
    this.globalActive = 0;
    this.categoryActive = { TEXT: 0, IMAGE: 0 };
    this.operationActive = {};
  }
}
