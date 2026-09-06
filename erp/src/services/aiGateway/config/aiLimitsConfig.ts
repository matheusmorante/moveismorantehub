import { AiCategory } from '../types/aiGatewayTypes';

export interface CategoryLimitConfig {
  concurrent: number;
  perMinute: number;
  perHour: number;
  perDay: number;
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
      perHour: 5,
      perDay: 5,
      model: 'gemini-3.1-flash-image'
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
