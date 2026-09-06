export type AiCategory = 'TEXT' | 'IMAGE' | 'TTS';

export type AiErrorCode =
  | 'AI_DAILY_LIMIT_REACHED'
  | 'AI_HOURLY_LIMIT_REACHED'
  | 'AI_RATE_LIMIT_REACHED'
  | 'AI_CONCURRENCY_LIMIT_REACHED'
  | 'AI_CIRCUIT_BREAKER_OPEN'
  | 'AI_FAIL_CLOSED_BLOCKED'
  | 'AI_DUPLICATE_REQUEST'
  | 'AI_SERVICE_ERROR';

export interface AiRequestOptions {
  category: AiCategory;
  operation: string;
  payload: any;
  userOrSource?: string;
  bypassDeduplication?: boolean;
}

export interface AiResponse<T = any> {
  success: boolean;
  data?: T;
  errorCode?: AiErrorCode;
  errorMessage?: string;
  userFriendlyMessage?: string;
  category: AiCategory;
  modelUsed: string;
  executionTimeMs?: number;
  fallbackUsed?: boolean;
}

export interface AiCategoryStats {
  category: AiCategory;
  model: string;
  usedToday: number;
  limitToday: number;
  usedHour: number;
  limitHour: number;
  usedMinute: number;
  limitMinute: number;
  activeConcurrent: number;
  limitConcurrent: number;
}

export interface AiGlobalStats {
  usedToday: number;
  limitToday: number;
  usedHour: number;
  limitHour: number;
  usedMinute: number;
  limitMinute: number;
  activeConcurrent: number;
  limitConcurrent: number;
  circuitBreakerOpen: boolean;
  circuitBreakerReason?: string;
  blockedTodayCount: number;
  categories: Record<AiCategory, AiCategoryStats>;
}
