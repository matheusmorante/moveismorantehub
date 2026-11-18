export interface TelemetryRow {
  id: string;
  module: string;
  screen: string;
  action: string;
  table_name: string;
  operation_type: string;
  execution_count: number;
  total_duration_ms: number;
  rows_returned: number;
  unknown_rows_count: number;
  response_bytes: number;
  measured_response_count: number;
  metric_kind?: 'supabase_request' | 'interaction_timing' | 'product_interaction_timing';
  app_version?: string | null;
  network_class?: string | null;
  viewport_class?: 'phone' | 'tablet' | 'desktop' | 'unknown' | null;
  result?: string | null;
  duration_buckets?: Record<string, number> | null;
  user_id: string;
  recorded_at: string;
}

export interface InteractionTimingRow {
  metric_kind: 'interaction_timing' | 'product_interaction_timing';
  screen: string;
  action: string;
  app_version: string;
  network_class: string;
  viewport_class: string;
  result: string;
  execution_count: number;
  total_duration_ms: number;
  duration_buckets: Record<string, number>;
}

export interface GlobalStats {
  totalReqs: number;
  selects: number;
  writes: number;
  realtime: number;
  responseBytes: number;
  measuredResponses: number;
}

export type PeriodType = '15m' | '1h' | '24h' | '7d';

export interface DrillDownItem {
  name: string;
  count: number;
  percent: number;
  avgRows: number | null;
  unknownRowsCount: number;
  avgDuration: number;
  items: TelemetryRow[];
}
