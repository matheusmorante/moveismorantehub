export type OperationType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC' | 'REALTIME' | 'STORAGE' | 'UNKNOWN';
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
}

export interface SupabaseAnomalyEvent {
  level: AlertLevel;
  title: string;
  message: string;
  metric?: AggregatedMetric;
  fingerprint?: string;
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export const GUARD_CONFIG = {
  WINDOW_MS: 5000,           // Janela de 5 segundos para analisar loops
  MAX_READ_REQUESTS: 20,     // Mais de 20 chamadas idênticas de SELECT = OPEN
  MAX_WRITE_REQUESTS: 10,    // Mais de 10 chamadas idênticas de WRITE/RPC = OPEN
  COOLDOWN_MS: 30000,        // 30 segundos bloqueado
  GLOBAL_KILL_SWITCH: 200,   // Mais de 200 chamadas globais na janela = EMERGENCY
};
