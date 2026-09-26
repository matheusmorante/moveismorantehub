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
  user_id: string;
  recorded_at: string;
}

export interface GlobalStats {
  totalReqs: number;
  selects: number;
  writes: number;
  realtime: number;
}

export type PeriodType = '15m' | '1h' | '24h' | '7d';

export interface DrillDownItem {
  name: string;
  count: number;
  percent: number;
  avgRows: number;
  avgDuration: number;
  items: TelemetryRow[];
}
