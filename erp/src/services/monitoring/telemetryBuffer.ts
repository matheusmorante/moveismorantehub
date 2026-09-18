import { TelemetryEvent, AggregatedMetric } from './types';

export class TelemetryBuffer {
  private buffer: Map<string, AggregatedMetric> = new Map();

  public track(event: TelemetryEvent, currentContext: { module: string, screen: string, action: string }) {
    const mod = event.module || currentContext.module;
    const scr = event.screen || currentContext.screen;
    const act = event.action || currentContext.action;

    // Chave de agregação única para agrupar as métricas em memória
    const key = `${mod}_${scr}_${act}_${event.table_name}_${event.operation_type}`;

    if (this.buffer.has(key)) {
      const existing = this.buffer.get(key)!;
      existing.execution_count += 1;
      existing.total_duration_ms += event.duration_ms;
      existing.rows_returned += event.rows_returned;
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
      });
    }
  }

  public getAndClear(): AggregatedMetric[] {
    if (this.buffer.size === 0) return [];
    const metricsToSave = Array.from(this.buffer.values());
    this.buffer.clear();
    return metricsToSave;
  }

  public getMetrics(): AggregatedMetric[] {
    return Array.from(this.buffer.values());
  }
}
