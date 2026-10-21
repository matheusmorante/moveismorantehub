import { AiCategory } from '../types/aiGatewayTypes';

export interface CategoryLimitConfig {
  concurrent: number;
  perMinute: number;
  perHour: number;
  perDay: number;
  perMonth?: number;
  monthlyBudgetBRL?: number;
  estimatedCostPerUnitBRL?: number;
  model: string;
  voice?: string;
}

export interface GlobalLimitConfig {
  concurrent: number;
  perMinute: number;
  perHour: number;
  perDay: number;
}

export interface AiLimitsConfig {
  global: GlobalLimitConfig;
  categories: Record<AiCategory, CategoryLimitConfig>;
}

export const AI_MODELS = {
  LITE: 'gemini-3.5-flash-lite',
  REASONING: 'gemini-3.8-flash',
  EMBEDDING: 'gemini-embedding-2',
  IMAGE: 'gemini-2.5-flash-image',
} as const;

export const CHARACTERISTICS_AI_LIMITS = {
  concurrent: 1,
  perMinute: 2,
  perHour: 20,
  perDay: 80,
  model: AI_MODELS.LITE,
  operation: 'catalog_extract_technical_specs',
} as const;

export const AI_LIMITS: AiLimitsConfig = {
  global: {
    concurrent: 3,
    perMinute: 10,
    perHour: 50,
    perDay: 120,
  },
  categories: {
    TEXT: {
      concurrent: 3,
      perMinute: 10,
      perHour: 30,
      perDay: 100,
      model: AI_MODELS.LITE,
    },
    IMAGE: {
      concurrent: 1,
      perMinute: 2,
      perHour: 15,
      perDay: 30,
      perMonth: 150, // ~150 gerações 1K @ ~R$ 0,20 = R$ 30,00/mês
      monthlyBudgetBRL: 30.0, // Cota financeira máxima mensal de R$ 30,00
      estimatedCostPerUnitBRL: 0.2,
      model: AI_MODELS.IMAGE,
    },
  },
};
