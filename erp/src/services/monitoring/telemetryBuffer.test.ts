import { describe, expect, it } from 'vitest';
import { TelemetryBuffer } from './telemetryBuffer';

describe('telemetria de respostas', () => {
  it('preserva medição que termina depois do envio sem duplicar a requisição', () => {
    const buffer = new TelemetryBuffer();
    const context = { module: 'ERP', screen: '/products', action: 'GET attributes' };
    const event = { table_name: 'attributes', operation_type: 'SELECT' as const, duration_ms: 10, rows_returned: 10 };
    buffer.track(event, context);
    expect(buffer.getAndClear()[0].execution_count).toBe(1);
    buffer.addMeasurement(event, context, 2048);
    expect(buffer.getMetrics()[0]).toMatchObject({ execution_count: 0, response_bytes: 2048, measured_response_count: 1 });
  });
});
