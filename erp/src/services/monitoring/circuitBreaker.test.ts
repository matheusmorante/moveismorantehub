import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from './circuitBreaker';

describe('limites do bloqueador', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
  afterEach(() => vi.useRealTimers());

  it('não conta tentativas já bloqueadas como tráfego global', () => {
    const emit = vi.fn();
    const breaker = new CircuitBreaker(emit);
    let sent = 0;
    for (let index = 0; index < 201; index++) if (breaker.check('repetida', 'SELECT')) sent++;
    expect(sent).toBe(20);
    expect(breaker.check('outra consulta', 'SELECT')).toBe(true);
    expect(emit.mock.calls.some(([event]) => event.title === 'Emergency Kill Switch Ativado')).toBe(false);
  });

  it('emite uma ocorrência para o limite global e não repete a cada bloqueio', () => {
    const emit = vi.fn();
    const breaker = new CircuitBreaker(emit);
    for (let index = 0; index < 200; index++) expect(breaker.check(String(index), 'SELECT')).toBe(true);
    expect(breaker.check('201', 'SELECT')).toBe(false);
    expect(breaker.check('202', 'SELECT')).toBe(false);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('reabre o circuito quando a tentativa após o intervalo falha', () => {
    const breaker = new CircuitBreaker(vi.fn());
    for (let index = 0; index < 21; index++) breaker.check('consulta', 'SELECT');
    vi.setSystemTime(31000);
    expect(breaker.check('consulta', 'SELECT')).toBe(true);
    breaker.onFailure('consulta');
    expect(breaker.check('consulta', 'SELECT')).toBe(false);
  });
});
