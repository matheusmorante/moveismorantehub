import {
  AggregatedMetric,
  InteractionDurationBucket,
  InteractionDurationHistogram,
  InteractionMetricKind,
  InteractionTimingSample,
  INTERACTION_DURATION_BUCKETS,
  PRODUCT_INTERACTION_DURATION_BUCKETS,
  TelemetryEvent,
} from './types';

const MAX_INTERACTION_DURATION_MS = 10 * 60 * 1000;

const createEmptyHistogram = (): InteractionDurationHistogram =>
  Object.fromEntries(INTERACTION_DURATION_BUCKETS.map((bucket) => [bucket, 0])) as InteractionDurationHistogram;

const pickDurationBucket = (durationMs: number): InteractionDurationBucket => {
  if (durationMs <= 50) return 'b_0_50_ms';
  if (durationMs <= 100) return 'b_51_100_ms';
  if (durationMs <= 250) return 'b_101_250_ms';
  if (durationMs <= 500) return 'b_251_500_ms';
  if (durationMs <= 1000) return 'b_501_1000_ms';
  if (durationMs <= 2000) return 'b_1001_2000_ms';
  if (durationMs <= 5000) return 'b_2001_5000_ms';
  if (durationMs <= 10000) return 'b_5001_10000_ms';
  if (durationMs <= 30000) return 'b_10001_30000_ms';
  return 'b_gt_30000_ms';
};

const pickProductInteractionBucket = (durationMs: number): string => {
  if (durationMs <= 50) return 'b_0_50_ms';
  if (durationMs <= 100) return 'b_51_100_ms';
  if (durationMs <= 200) return 'b_101_200_ms';
  if (durationMs <= 250) return 'b_201_250_ms';
  if (durationMs <= 500) return 'b_251_500_ms';
  if (durationMs <= 1000) return 'b_501_1000_ms';
  if (durationMs <= 2000) return 'b_1001_2000_ms';
  if (durationMs <= 2500) return 'b_2001_2500_ms';
  if (durationMs <= 4000) return 'b_2501_4000_ms';
  if (durationMs <= 5000) return 'b_4001_5000_ms';
  if (durationMs <= 10000) return 'b_5001_10000_ms';
  if (durationMs <= 30000) return 'b_10001_30000_ms';
  return 'b_gt_30000_ms';
};

export class TelemetryBuffer {
  private buffer: Map<string, AggregatedMetric> = new Map();

  private getKey(metric: AggregatedMetric): string {
    return JSON.stringify([
      metric.module,
      metric.screen,
      metric.action,
      metric.table_name,
      metric.operation_type,
      metric.metric_kind || 'supabase_request',
      metric.app_version || null,
      metric.network_class || null,
      metric.metric_kind === 'product_interaction_timing' ? metric.viewport_class || null : null,
      metric.result || null,
    ]);
  }

  public track(
    event: TelemetryEvent,
    currentContext: { module: string; screen: string; action: string }
  ) {
    const mod = event.module || currentContext.module;
    const scr = event.screen || currentContext.screen;
    const act = event.action || currentContext.action;

    const metric: AggregatedMetric = {
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
      metric_kind: 'supabase_request',
    };
    const key = this.getKey(metric);

    if (this.buffer.has(key)) {
      const existing = this.buffer.get(key)!;
      existing.execution_count += 1;
      existing.total_duration_ms += event.duration_ms;
      existing.rows_returned += event.rows_returned;
      existing.unknown_rows_count = (existing.unknown_rows_count || 0) + (event.rows_count_known === false ? 1 : 0);
      existing.response_bytes = (existing.response_bytes || 0) + (event.response_bytes || 0);
      existing.measured_response_count = (existing.measured_response_count || 0) + (event.response_bytes == null ? 0 : 1);
    } else {
      this.buffer.set(key, metric);
    }
  }

  public trackInteractionTiming(sample: InteractionTimingSample) {
    if (!Number.isFinite(sample.duration_ms) || sample.duration_ms < 0 || sample.duration_ms > MAX_INTERACTION_DURATION_MS) {
      return;
    }

    const metricKind: InteractionMetricKind = sample.metric_kind || 'interaction_timing';
    const durationMs = Math.round(sample.duration_ms);
    const histogram: Record<string, number> = metricKind === 'product_interaction_timing'
      ? Object.fromEntries(PRODUCT_INTERACTION_DURATION_BUCKETS.map((bucket) => [bucket, 0]))
      : createEmptyHistogram();
    histogram[metricKind === 'product_interaction_timing'
      ? pickProductInteractionBucket(durationMs)
      : pickDurationBucket(durationMs)] = 1;
    const metric: AggregatedMetric = {
      module: sample.module,
      screen: sample.screen,
      action: sample.action,
      table_name: 'client_interaction',
      operation_type: 'UNKNOWN',
      execution_count: 1,
      total_duration_ms: durationMs,
      rows_returned: 0,
      unknown_rows_count: 0,
      response_bytes: 0,
      measured_response_count: 0,
      metric_kind: metricKind,
      app_version: sample.app_version,
      network_class: sample.network_class,
      viewport_class: sample.viewport_class,
      result: sample.result,
      duration_buckets: histogram,
    };
    const key = this.getKey(metric);
    const existing = this.buffer.get(key);

    if (!existing) {
      this.buffer.set(key, metric);
      return;
    }

    existing.execution_count += 1;
    existing.total_duration_ms += durationMs;
    const target = existing.duration_buckets || createEmptyHistogram();
    const bucket = metricKind === 'product_interaction_timing'
      ? pickProductInteractionBucket(durationMs)
      : pickDurationBucket(durationMs);
    target[bucket] += 1;
    existing.duration_buckets = target;
  }

  public addMeasurement(
    event: TelemetryEvent,
    currentContext: { module: string; screen: string; action: string },
    bytes: number
  ) {
    const mod = event.module || currentContext.module;
    const scr = event.screen || currentContext.screen;
    const act = event.action || currentContext.action;
    const key = this.getKey({
      module: mod,
      screen: scr,
      action: act,
      table_name: event.table_name,
      operation_type: event.operation_type,
      execution_count: 0,
      total_duration_ms: 0,
      rows_returned: 0,
      metric_kind: 'supabase_request',
    });
    const existing = this.buffer.get(key);
    if (existing) {
      existing.response_bytes = (existing.response_bytes || 0) + bytes;
      existing.measured_response_count = (existing.measured_response_count || 0) + 1;
    } else {
      this.buffer.set(key, {
        module: mod, screen: scr, action: act, table_name: event.table_name,
        operation_type: event.operation_type, execution_count: 0, total_duration_ms: 0,
        rows_returned: 0, unknown_rows_count: 0, response_bytes: bytes, measured_response_count: 1,
        metric_kind: 'supabase_request',
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
      const key = this.getKey(metric);
      const existing = this.buffer.get(key);
      if (existing) {
        existing.execution_count += metric.execution_count;
        existing.total_duration_ms += metric.total_duration_ms;
        existing.rows_returned += metric.rows_returned;
        existing.unknown_rows_count = (existing.unknown_rows_count || 0) + (metric.unknown_rows_count || 0);
        existing.response_bytes = (existing.response_bytes || 0) + (metric.response_bytes || 0);
        existing.measured_response_count = (existing.measured_response_count || 0) + (metric.measured_response_count || 0);
        if (metric.duration_buckets) {
          const buckets = { ...(existing.duration_buckets || {}) };
          Object.entries(metric.duration_buckets).forEach(([bucket, count]) => {
            buckets[bucket] = (buckets[bucket] || 0) + count;
          });
          existing.duration_buckets = buckets;
        }
      } else {
        this.buffer.set(key, { ...metric });
      }
    }
  }

  public getMetrics(): AggregatedMetric[] {
    return Array.from(this.buffer.values());
  }
}
