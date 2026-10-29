import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnomalyDetector } from './anomalyDetector';
import { GUARD_CONFIG } from './types';

const context = { module: 'ERP', screen: '/products', action: 'consulta' };
const event = { table_name: 'attributes', operation_type: 'SELECT' as const, duration_ms: 5, rows_returned: 1000, rows_count_known: true };

describe('detecção em janela de cinco minutos', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
  afterEach(() => vi.useRealTimers());

  it('emite o alerta ao atingir o limite, inclusive no fim da janela de envio', () => {
    const emit = vi.fn();
    const detector = new AnomalyDetector(emit);
    vi.setSystemTime(270000);
    for (let index = 0; index < 6; index++) detector.track(event, context);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toMatchObject({
      title: 'Carga Massiva em attributes',
      metric: { execution_count: 6, rows_returned: 6000 },
    });
    vi.setSystemTime(300000);
    detector.prune();
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('permite um novo alerta depois que os dados anteriores saem da janela', () => {
    const emit = vi.fn();
    const detector = new AnomalyDetector(emit);
    for (let index = 0; index < 6; index++) detector.track(event, context);
    vi.setSystemTime(301000);
    detector.prune();
    for (let index = 0; index < 6; index++) detector.track(event, context);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('rearma o alerta mesmo quando sobram consultas abaixo do limite', () => {
    const emit = vi.fn();
    const detector = new AnomalyDetector(emit);
    detector.track({ ...event, rows_returned: 5001 }, context);
    vi.setSystemTime(200000);
    detector.track({ ...event, rows_returned: 1 }, context);
    vi.setSystemTime(301000);
    detector.track({ ...event, rows_returned: 5001 }, context);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('identifica dados informados em bytes como estimativa parcial', () => {
    const emit = vi.fn();
    const detector = new AnomalyDetector(emit);
    detector.track({ ...event, rows_returned: 0, rows_count_known: false, response_bytes: GUARD_CONFIG.MAX_WINDOW_RESPONSE_BYTES + 1 }, context);
    expect(emit.mock.calls[0][0]).toMatchObject({
      title: 'Alto volume de dados em attributes',
      metric: { unknown_rows_count: 1, measured_response_count: 1 },
    });
    expect(emit.mock.calls[0][0].message).toContain('estimativa parcial');
  });

  it('adiciona uma medição posterior sem contar outra requisição', () => {
    const emit = vi.fn();
    const detector = new AnomalyDetector(emit);
    detector.track({ ...event, rows_returned: 0 }, context, 0);
    detector.addMeasurement(event, context, GUARD_CONFIG.MAX_WINDOW_RESPONSE_BYTES + 1, 0);
    expect(emit.mock.calls[0][0].metric).toMatchObject({ execution_count: 1, measured_response_count: 1 });
  });

  it('soma dados de recursos diferentes na mesma sessão', () => {
    const emit = vi.fn();
    const detector = new AnomalyDetector(emit);
    const half = Math.ceil(GUARD_CONFIG.MAX_WINDOW_RESPONSE_BYTES / 2);
    detector.track({ ...event, rows_returned: 0, response_bytes: half }, context);
    detector.track({ ...event, table_name: 'categories', rows_returned: 0, response_bytes: half + 1 }, context);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toMatchObject({
      title: 'Alto volume de dados no ERP',
      metric: { response_bytes: half * 2 + 1, measured_response_count: 2 },
    });
  });
});
