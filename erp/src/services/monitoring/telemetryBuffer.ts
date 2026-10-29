import { TelemetryEvent, AggregatedMetric } from './types';

export class TelemetryBuffer {
  private buffer: Map<string, AggregatedMetric> = new Map();

  public track(
    event: TelemetryEvent,
    currentContext: { module: string; screen: string; action: string }
  ) {
    const mod = event.module || currentContext.module;
    const scr = event.screen || currentContext.screen;
    const act = event.action || currentContext.action;

    // Chave de agregação única para agrupar as métricas em memória
    const key = JSON.stringify([mod, scr, act, event.table_name, event.operation_type]);

    if (this.buffer.has(key)) {
      const existing = this.buffer.get(key)!;
      existing.execution_count += 1;
      existing.total_duration_ms += event.duration_ms;
      existing.rows_returned += event.rows_returned;
      existing.unknown_rows_count = (existing.unknown_rows_count || 0) + (event.rows_count_known === false ? 1 : 0);
      existing.response_bytes = (existing.response_bytes || 0) + (event.response_bytes || 0);
      existing.measured_response_count = (existing.measured_response_count || 0) + (event.response_bytes == null ? 0 : 1);
    } else {
      this.buffer.set(key, {
        module: mod,
        screen: scr,
        action: act,
        table_name: event.table_name,
        operation_type: event.operation_type,
        execution_count: 1,
        total_duration_ms: event.duration_ms,
        rows_returned: event.rows_returned,
        unknown_rows_count: event.rows_count_known === false ? 1 : 0,
        response_bytes: event.response_bytes || 0,
        measured_response_count: event.response_bytes == null ? 0 : 1,
      });
    }
  }

  public addMeasurement(
    event: TelemetryEvent,
    currentContext: { module: string; screen: string; action: string },
    bytes: number
  ) {
    const mod = event.module || currentContext.module;
    const scr = event.screen || currentContext.screen;
    const act = event.action || currentContext.action;
    const key = JSON.stringify([mod, scr, act, event.table_name, event.operation_type]);
    const existing = this.buffer.get(key);
    if (existing) {
      existing.response_bytes = (existing.response_bytes || 0) + bytes;
      existing.measured_response_count = (existing.measured_response_count || 0) + 1;
    } else {
      this.buffer.set(key, {
        module: mod, screen: scr, action: act, table_name: event.table_name,
        operation_type: event.operation_type, execution_count: 0, total_duration_ms: 0,
        rows_returned: 0, unknown_rows_count: 0, response_bytes: bytes, measured_response_count: 1,
      });
    }
  }

  public getAndClear(): AggregatedMetric[] {
    if (this.buffer.size === 0) return [];
    const metricsToSave = Array.from(this.buffer.values());
    this.buffer.clear();
    return metricsToSave;
  }

  public merge(metrics: AggregatedMetric[]) {
    for (const metric of metrics) {
      const key = JSON.stringify([metric.module, metric.screen, metric.action, metric.table_name, metric.operation_type]);
      const existing = this.buffer.get(key);
      if (existing) {
        existing.execution_count += metric.execution_count;
        existing.total_duration_ms += metric.total_duration_ms;
        existing.rows_returned += metric.rows_returned;
        existing.unknown_rows_count = (existing.unknown_rows_count || 0) + (metric.unknown_rows_count || 0);
        existing.response_bytes = (existing.response_bytes || 0) + (metric.response_bytes || 0);
        existing.measured_response_count = (existing.measured_response_count || 0) + (metric.measured_response_count || 0);
      } else {
        this.buffer.set(key, { ...metric });
      }
    }
  }

  public getMetrics(): AggregatedMetric[] {
    return Array.from(this.buffer.values());
  }
}
