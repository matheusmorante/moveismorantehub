export type OperationType =
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'RPC'
  | 'REALTIME'
  | 'STORAGE'
  | 'UNKNOWN';

export const INTERACTION_DURATION_BUCKETS = [
  'b_0_50_ms',
  'b_51_100_ms',
  'b_101_250_ms',
  'b_251_500_ms',
  'b_501_1000_ms',
  'b_1001_2000_ms',
  'b_2001_5000_ms',
  'b_5001_10000_ms',
  'b_10001_30000_ms',
  'b_gt_30000_ms',
] as const;

export type InteractionDurationBucket = (typeof INTERACTION_DURATION_BUCKETS)[number];
export type InteractionDurationHistogram = Record<InteractionDurationBucket, number>;
export const PRODUCT_INTERACTION_DURATION_BUCKETS = [
  'b_0_50_ms',
  'b_51_100_ms',
  'b_101_200_ms',
  'b_201_250_ms',
  'b_251_500_ms',
  'b_501_1000_ms',
  'b_1001_2000_ms',
  'b_2001_2500_ms',
  'b_2501_4000_ms',
  'b_4001_5000_ms',
  'b_5001_10000_ms',
  'b_10001_30000_ms',
  'b_gt_30000_ms',
] as const;

export type ProductInteractionDurationBucket = (typeof PRODUCT_INTERACTION_DURATION_BUCKETS)[number];
export type ProductInteractionDurationHistogram = Record<ProductInteractionDurationBucket, number>;
export type InteractionMetricKind = 'interaction_timing' | 'product_interaction_timing';
export type InteractionTimingAction =
  | 'sale_completion_click_to_indicator'
  | 'sale_completion_click_to_result'
  | 'post_picker_search_to_results'
  | 'post_picker_select_to_preview'
  | 'erp_page_lcp'
  | 'erp_page_inp';
export type MarketingPostTimingAction = 'post_picker_search_to_results' | 'post_picker_select_to_preview';
export type InteractionTimingResult = 'visible' | 'success' | 'failure' | 'observed';
export type InteractionNetworkClass = 'offline' | 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
export type InteractionViewportClass = 'phone' | 'tablet' | 'desktop' | 'unknown';

export interface InteractionTimingSample {
  metric_kind?: InteractionMetricKind;
  module: 'Sales' | 'Marketing' | 'Global';
  screen: 'NewSaleOrder' | 'Posts' | 'ERP';
  action: InteractionTimingAction;
  app_version: string;
  network_class: InteractionNetworkClass;
  viewport_class: InteractionViewportClass;
  result: InteractionTimingResult;
  duration_ms: number;
}

export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface TelemetryEvent {
  module?: string;
  screen?: string;
  action?: string;
  table_name: string;
  operation_type: OperationType;
  duration_ms: number;
  rows_returned: number;
  rows_count_known?: boolean;
  response_bytes?: number;
}

export interface AggregatedMetric {
  module: string;
  screen: string;
  action: string;
  table_name: string;
  operation_type: OperationType;
  execution_count: number;
  total_duration_ms: number;
  rows_returned: number;
  unknown_rows_count?: number;
  response_bytes?: number;
  measured_response_count?: number;
  metric_kind?: 'supabase_request' | InteractionMetricKind;
  app_version?: string | null;
  network_class?: InteractionNetworkClass | null;
  viewport_class?: InteractionViewportClass | null;
  result?: InteractionTimingResult | null;
  duration_buckets?: Record<string, number> | null;
}

export interface SupabaseAnomalyEvent {
  level: AlertLevel;
  title: string;
  message: string;
  metric?: AggregatedMetric;
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export const GUARD_CONFIG = {
  WINDOW_MS: 5000, // Janela de 5 segundos para analisar loops
  MAX_READ_REQUESTS: 20, // Mais de 20 chamadas idênticas de SELECT = OPEN
  MAX_WRITE_REQUESTS: 10, // Mais de 10 chamadas idênticas de WRITE/RPC = OPEN
  COOLDOWN_MS: 30000, // 30 segundos bloqueado
  GLOBAL_KILL_SWITCH: 200, // Mais de 200 chamadas globais na janela = EMERGENCY
  AGGREGATE_WINDOW_MS: 300000,
  MAX_WINDOW_RESPONSE_BYTES: 25 * 1024 * 1024,
};
