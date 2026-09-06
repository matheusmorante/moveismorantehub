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

export const AI_LIMITS: AiLimitsConfig = {
  global: {
    concurrent: 3,
    perMinute: 10,
    perHour: 50,
    perDay: 120
  },
  categories: {
    TEXT: {
      concurrent: 3,
      perMinute: 10,
      perHour: 30,
      perDay: 100,
      model: 'gemini-2.5-flash'
    },
    IMAGE: {
      concurrent: 1,
      perMinute: 2,
      perHour: 15,
      perDay: 30,
      perMonth: 150, // ~150 gerações 1K @ ~R$ 0,20 = R$ 30,00/mês
      monthlyBudgetBRL: 30.00, // Cota financeira máxima mensal de R$ 30,00
      estimatedCostPerUnitBRL: 0.20,
      model: 'gemini-2.5-flash-image'
    },
    TTS: {
      concurrent: 1,
      perMinute: 5,
      perHour: 30,
      perDay: 30,
      voice: 'Aoede', // Voz feminina informativa e profissional do Gemini
      model: 'gemini-3.1-flash-tts'
    }
  }
};
