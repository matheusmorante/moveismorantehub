import { GUARD_CONFIG } from './types';
import type { AggregatedMetric, SupabaseAnomalyEvent, TelemetryEvent } from './types';

type Context = { module: string; screen: string; action: string };
type Bucket = {
  second: number;
  count: number;
  duration: number;
  rows: number;
  unknownRows: number;
  bytes: number;
  measured: number;
};
type Window = {
  context: Context;
  tableName: string;
  operation: TelemetryEvent['operation_type'];
  buckets: Bucket[];
  loopActive: boolean;
  rowsActive: boolean;
  bytesActive: boolean;
};
type ByteBucket = { second: number; bytes: number; measured: number; sources: Set<string> };

/** Janelas independentes do envio de telemetria, agregadas por segundo. */
export class AnomalyDetector {
  private windows = new Map<string, Window>();
  private globalBytes: ByteBucket[] = [];
  private globalBytesActive = false;

  constructor(private emitAnomaly: (event: SupabaseAnomalyEvent) => void) {}

  public track(event: TelemetryEvent, context: Context, observedAt = Date.now()) {
    const resolved = {
      module: event.module || context.module,
      screen: event.screen || context.screen,
      action: event.action || context.action,
    };
    const key = JSON.stringify([resolved.module, resolved.screen, resolved.action, event.table_name, event.operation_type]);
    let window = this.windows.get(key);
    if (!window) {
      window = { context: resolved, tableName: event.table_name, operation: event.operation_type, buckets: [], loopActive: false, rowsActive: false, bytesActive: false };
      this.windows.set(key, window);
    }

    const second = Math.floor(observedAt / 1000);
    const expired = this.removeExpired(window, second);
    if (expired && window.buckets.length) this.evaluate(window);
    let bucket = window.buckets[window.buckets.length - 1];
    if (!bucket || bucket.second !== second) {
      bucket = { second, count: 0, duration: 0, rows: 0, unknownRows: 0, bytes: 0, measured: 0 };
      window.buckets.push(bucket);
    }
    bucket.count += 1;
    bucket.duration += event.duration_ms;
    bucket.rows += event.rows_returned;
    if (event.rows_count_known === false) bucket.unknownRows += 1;
    if (event.response_bytes != null) {
      bucket.bytes += event.response_bytes;
      bucket.measured += 1;
    }
    this.evaluate(window);
    if (event.response_bytes != null) this.recordGlobalBytes(event, event.response_bytes, observedAt);
  }

  public addMeasurement(event: TelemetryEvent, context: Context, bytes: number, observedAt: number) {
    const key = JSON.stringify([
      event.module || context.module, event.screen || context.screen, event.action || context.action,
      event.table_name, event.operation_type,
    ]);
    const window = this.windows.get(key);
    if (!window) return;
    const expired = this.removeExpired(window, Math.floor(Date.now() / 1000));
    if (expired && window.buckets.length) this.evaluate(window);
    const bucket = window.buckets.find((item) => item.second === Math.floor(observedAt / 1000));
    if (!bucket) return;
    bucket.bytes += bytes;
    bucket.measured += 1;
    this.evaluate(window);
    this.recordGlobalBytes(event, bytes, observedAt);
  }

  public prune() {
    const second = Math.floor(Date.now() / 1000);
    for (const [key, window] of this.windows) {
      const expired = this.removeExpired(window, second);
      if (window.buckets.length === 0) this.windows.delete(key);
      else if (expired) this.evaluate(window);
    }
    this.evaluateGlobalBytes(second);
  }

  private recordGlobalBytes(event: TelemetryEvent, bytes: number, observedAt: number) {
    const nowSecond = Math.floor(Date.now() / 1000);
    const observedSecond = Math.floor(observedAt / 1000);
    if (observedSecond <= nowSecond - GUARD_CONFIG.AGGREGATE_WINDOW_MS / 1000) return;
    this.evaluateGlobalBytes(nowSecond);
    let bucket = this.globalBytes.find((item) => item.second === observedSecond);
    if (!bucket) {
      bucket = { second: observedSecond, bytes: 0, measured: 0, sources: new Set() };
      this.globalBytes.push(bucket);
    }
    bucket.bytes += bytes;
    bucket.measured += 1;
    bucket.sources.add(JSON.stringify([event.table_name, event.operation_type]));
    this.evaluateGlobalBytes(nowSecond);
  }

  private evaluateGlobalBytes(second: number) {
    const firstSecond = second - GUARD_CONFIG.AGGREGATE_WINDOW_MS / 1000;
    this.globalBytes = this.globalBytes.filter((item) => item.second > firstSecond);
    let bytes = 0;
    let measured = 0;
    const sources = new Set<string>();
    for (const bucket of this.globalBytes) {
      bytes += bucket.bytes;
      measured += bucket.measured;
      bucket.sources.forEach((source) => sources.add(source));
    }
    const active = bytes > GUARD_CONFIG.MAX_WINDOW_RESPONSE_BYTES && sources.size > 1;
    if (active && !this.globalBytesActive) this.emitAnomaly({
      level: 'WARNING',
      title: 'Alto volume de dados no ERP',
      message: `O conteúdo medido em vários recursos chegou a ${(bytes / 1024 / 1024).toFixed(1)} MiB em até 5 minutos neste navegador. É uma estimativa parcial; consulte o Supabase para o egress faturável.`,
      metric: {
        module: 'ERP', screen: 'Várias telas', action: 'Respostas medidas',
        table_name: 'Vários recursos', operation_type: 'UNKNOWN',
        execution_count: measured, total_duration_ms: 0, rows_returned: 0,
        unknown_rows_count: measured, response_bytes: bytes, measured_response_count: measured,
      },
    });
    this.globalBytesActive = active;
  }

  private removeExpired(window: Window, second: number) {
    const firstSecond = second - GUARD_CONFIG.AGGREGATE_WINDOW_MS / 1000;
    let removed = false;
    while (window.buckets.length > 0 && window.buckets[0].second <= firstSecond) {
      window.buckets.shift();
      removed = true;
    }
    if (!window.buckets.length) {
      window.loopActive = false;
      window.rowsActive = false;
      window.bytesActive = false;
    }
    return removed;
  }

  private evaluate(window: Window) {
    const totals = window.buckets.reduce((result, bucket) => ({
      count: result.count + bucket.count,
      duration: result.duration + bucket.duration,
      rows: result.rows + bucket.rows,
      unknownRows: result.unknownRows + bucket.unknownRows,
      bytes: result.bytes + bucket.bytes,
      measured: result.measured + bucket.measured,
    }), { count: 0, duration: 0, rows: 0, unknownRows: 0, bytes: 0, measured: 0 });
    const metric: AggregatedMetric = {
      ...window.context,
      table_name: window.tableName,
      operation_type: window.operation,
      execution_count: totals.count,
      total_duration_ms: totals.duration,
      rows_returned: totals.rows,
      unknown_rows_count: totals.unknownRows,
      response_bytes: totals.bytes,
      measured_response_count: totals.measured,
    };

    const loop = totals.count > 100;
    if (loop && !window.loopActive) this.emitAnomaly({
      level: 'WARNING',
      title: `Volume elevado de requisições em ${window.tableName}`,
      message: `${totals.count} requisições em até 5 minutos neste navegador. Verifique se há repetição desnecessária.`,
      metric,
    });
    window.loopActive = loop;

    const rows = totals.rows > 5000;
    if (rows && !window.rowsActive) this.emitAnomaly({
      level: 'WARNING',
      title: `Carga Massiva em ${window.tableName}`,
      message: totals.count === 1
        ? `Consulta retornou ${totals.rows} registros. Verifique se todos são necessários.`
        : `Múltiplas consultas (${totals.count}x) retornaram ${totals.rows} registros agregados na tabela ${window.tableName}.`,
      metric,
    });
    window.rowsActive = rows;

    const bytes = totals.bytes > GUARD_CONFIG.MAX_WINDOW_RESPONSE_BYTES;
    if (bytes && !window.bytesActive) this.emitAnomaly({
      level: 'WARNING',
      title: `Alto volume de dados em ${window.tableName}`,
      message: `O conteúdo medido chegou a ${(totals.bytes / 1024 / 1024).toFixed(1)} MiB em até 5 minutos neste navegador. É uma estimativa parcial; consulte o Supabase para o egress faturável.`,
      metric,
    });
    window.bytesActive = bytes;
  }
}
