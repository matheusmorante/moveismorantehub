/** @vitest-environment happy-dom */
import { expect, test, describe, beforeEach, afterEach, vi, Mock } from 'vitest';
import { supabaseMonitor, CircuitBreakerError } from '../../../services/monitoring';

describe('QueryGuard (SupabaseMonitorService)', () => {
  let mockFetch: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      clone: function () {
        return this;
      },
      headers: new Headers(),
    });
    window.fetch = mockFetch;
    // Limpar o breaker que mantém os contadores; o wrapper não os armazena.
    const circuitBreaker = (supabaseMonitor as any).circuitBreaker;
    circuitBreaker.hitCounters = new Map();
    circuitBreaker.circuitStates = new Map();
    circuitBreaker.globalHitCounter = [];
    (supabaseMonitor as any).inFlightRequests = new Map();
    (supabaseMonitor as any).lastServiceRestrictionAt = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test('Caso A - loop de leitura (Circuit Breaker abre)', async () => {
    const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/orders?select=*';

    let blockedCount = 0;
    let allowedCount = 0;

    for (let i = 0; i < 25; i++) {
      try {
        await supabaseMonitor.customFetch(url, { method: 'GET' });
        allowedCount++;
        vi.advanceTimersByTime(10); // Chamadas quase instantâneas
      } catch (e) {
        if (e instanceof CircuitBreakerError) {
          blockedCount++;
        }
      }
    }

    // Limite MAX_READ_REQUESTS é 20, deduplicação pode intervir também.
    // Já que são chamadas "in flight" sendo resolvidas imediatamente neste mock sincrono,
    // elas podem bater os contadores rápido.
    expect(blockedCount).toBeGreaterThan(0);
    expect(allowedCount).toBeLessThanOrEqual(20);

    // Verifica que window.fetch não foi chamado 25 vezes
    expect(mockFetch).toHaveBeenCalledTimes(allowedCount);
  });

  test('Caso B - chamadas legítimas diferentes (Não bloqueia)', async () => {
    for (let i = 0; i < 25; i++) {
      const url = `https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/orders?select=*&id=eq.${i}`;
      await supabaseMonitor.customFetch(url, { method: 'GET' });
      vi.advanceTimersByTime(10);
    }

    // Como o fingerprint muda por causa da URL diferente, não deve dar circuito aberto
    expect(mockFetch).toHaveBeenCalledTimes(25);
  });

  test('Caso C - chamadas simultâneas idênticas (Deduplicação)', async () => {
    vi.useRealTimers();
    const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/customers?select=*';

    // A resposta deve continuar pendente enquanto as chaves são calculadas.
    mockFetch.mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            clone: function () {
              return this;
            },
            headers: new Headers(),
          });
        }, 50);
      })
    );

    // Mais chamadas que o limite devem compartilhar uma única leitura pendente.
    const requests = Array.from({ length: 25 }, () =>
      supabaseMonitor.customFetch(url, { method: 'GET' })
    );

    const results = await Promise.allSettled(requests);

    // Deveria ter ido pra rede apenas 1 vez, e retornado a mesma promise clonada
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
  });

  test('Caso D - cooldown (OPEN -> HALF_OPEN -> CLOSED)', async () => {
    const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/products?select=*';

    // Estourar o limite (21 chamadas síncronas)
    for (let i = 0; i < 25; i++) {
      try {
        await supabaseMonitor.customFetch(url, { method: 'GET' });
      } catch (e) {
        /* no-op: intencionalmente silencioso */
      }
    }

    // Deve estar OPEN agora
    await expect(supabaseMonitor.customFetch(url, { method: 'GET' })).rejects.toThrow(
      CircuitBreakerError
    );

    // Avançar o tempo (31 segundos = maior que COOLDOWN_MS de 30000ms)
    vi.advanceTimersByTime(31000);

    // Deve passar em HALF_OPEN e fechar o circuito
    await expect(supabaseMonitor.customFetch(url, { method: 'GET' })).resolves.not.toThrow();
  });

  test('Caso E - loop continua após cooldown (HALF_OPEN -> OPEN)', async () => {
    const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/stocks?select=*';

    // Estourar
    for (let i = 0; i < 25; i++) {
      try {
        await supabaseMonitor.customFetch(url, { method: 'GET' });
      } catch (e) {
        /* no-op: intencionalmente silencioso */
      }
    }

    // Cooldown
    vi.advanceTimersByTime(31000);

    // Loop recomeça agressivamente
    let blockedCount = 0;
    for (let i = 0; i < 25; i++) {
      try {
        await supabaseMonitor.customFetch(url, { method: 'GET' });
      } catch (e) {
        if (e instanceof CircuitBreakerError) blockedCount++;
      }
    }

    expect(blockedCount).toBeGreaterThan(0);
  });

  test('Caso H - Escritas (POST/PATCH) bloqueiam com limite menor e NÃO deduplicam', async () => {
    const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/orders';

    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            clone: function () {
              return this;
            },
            headers: new Headers(),
          });
        }, 100);
      })
    );

    // Disparar 3 inserções simultâneas
    const p1 = supabaseMonitor.customFetch(url, { method: 'POST', body: '{"a":1}' });
    const p2 = supabaseMonitor.customFetch(url, { method: 'POST', body: '{"a":1}' });
    const p3 = supabaseMonitor.customFetch(url, { method: 'POST', body: '{"a":1}' });

    vi.advanceTimersByTime(150);
    await Promise.all([p1, p2, p3]);

    // Não há deduplicação para POST, então as 3 foram pra rede
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // O limite de WRITE é 10. Se mandarmos mais 8 iguais, deve abrir circuito
    let blocked = false;
    for (let i = 0; i < 8; i++) {
      try {
        await supabaseMonitor.customFetch(url, { method: 'POST', body: '{"a":1}' });
      } catch (e) {
        blocked = true;
      }
    }
    expect(blocked).toBe(true);
  });

  test('Kill Switch Global', async () => {
    const url = 'https://hkoxhourxwlddgsfdgws.supabase.co/rest/v1/diverse';

    // Disparar 205 requisições aleatórias rápidas (limite 200)
    let blockedCount = 0;
    for (let i = 0; i < 205; i++) {
      try {
        // URLs diferentes para fugir do loop detector individual
        await supabaseMonitor.customFetch(`${url}_${i}`, { method: 'GET' });
      } catch (e) {
        if (e instanceof CircuitBreakerError) blockedCount++;
      }
    }

    expect(blockedCount).toBeGreaterThan(0);
    expect(blockedCount).toBe(5); // Bloqueou as últimas 5 da janela
  });

  test('leituras simultâneas com cabeçalhos diferentes não compartilham resposta', async () => {
    vi.useRealTimers();
    const url = 'https://example.invalid/rest/v1/items?select=id';
    mockFetch.mockImplementation((_input, init) => new Promise((resolve) => {
      const accept = new Headers(init.headers).get('Accept');
      setTimeout(() => resolve(new Response(accept === 'application/json' ? '[{"id":1}]' : '{"id":1}')), 50);
    }));
    const list = supabaseMonitor.customFetch(url, { headers: { Accept: 'application/json' } });
    const item = supabaseMonitor.customFetch(url, { headers: { Accept: 'application/vnd.pgrst.object+json' } });
    const [listResponse, itemResponse] = await Promise.all([list, item]);
    expect(await listResponse.json()).toEqual([{ id: 1 }]);
    expect(await itemResponse.json()).toEqual({ id: 1 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('alerta de repetição não expõe o corpo de autenticação', async () => {
    const listener = vi.fn();
    window.addEventListener('SUPABASE_ANOMALY', listener);
    try {
      for (let i = 0; i < 11; i++) {
        try {
          await supabaseMonitor.customFetch('https://example.invalid/auth/v1/token', {
            method: 'POST',
            body: JSON.stringify({ email: 'dummy@example.invalid', password: 'dummy-password' }),
          });
        } catch { /* limite atingido */ }
      }
      expect(listener).toHaveBeenCalled();
      expect(JSON.stringify((listener.mock.calls[0][0] as CustomEvent).detail)).not.toContain('dummy-password');
      expect(JSON.stringify((listener.mock.calls[0][0] as CustomEvent).detail)).not.toContain('dummy@example.invalid');
    } finally {
      window.removeEventListener('SUPABASE_ANOMALY', listener);
    }
  });

  test('leituras com credenciais diferentes não compartilham dados', async () => {
    vi.useRealTimers();
    const url = 'https://example.invalid/rest/v1/items?select=id';
    mockFetch.mockImplementation((_input, init) => new Promise((resolve) => {
      const identity = new Headers(init.headers).get('Authorization');
      setTimeout(() => resolve(new Response(JSON.stringify({ identity }))), 50);
    }));
    const first = supabaseMonitor.customFetch(url, { headers: { Authorization: 'Bearer dummy-a' } });
    const second = supabaseMonitor.customFetch(url, { headers: { Authorization: 'Bearer dummy-b' } });
    const [firstResponse, secondResponse] = await Promise.all([first, second]);
    expect(await firstResponse.json()).toEqual({ identity: 'Bearer dummy-a' });
    expect(await secondResponse.json()).toEqual({ identity: 'Bearer dummy-b' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('identifica respostas sem contagem e guarda somente bytes informados', async () => {
    const buffer = (supabaseMonitor as any).telemetryBuffer;
    buffer.getAndClear();
    mockFetch.mockResolvedValueOnce(new Response('[]', { headers: { 'Content-Length': '1234' } }));
    await supabaseMonitor.customFetch('https://example.invalid/rest/v1/measurement?select=id');
    expect(buffer.getMetrics()).toEqual([expect.objectContaining({
      table_name: 'measurement',
      rows_returned: 0,
      unknown_rows_count: 1,
      response_bytes: 1234,
      measured_response_count: 1,
    })]);
  });

  test('mede JSON sem cabeçalho de tamanho sem consumir a resposta do chamador', async () => {
    vi.useRealTimers();
    const buffer = (supabaseMonitor as any).telemetryBuffer;
    buffer.getAndClear();
    const body = JSON.stringify([{ id: 1 }, { id: 2 }]);
    mockFetch.mockResolvedValueOnce(new Response(body, { headers: { 'Content-Type': 'application/json' } }));
    const response = await supabaseMonitor.customFetch('https://example.invalid/rest/v1/json_measurement?select=id');
    expect(await response.json()).toEqual([{ id: 1 }, { id: 2 }]);
    await vi.waitFor(() => expect(buffer.getMetrics()[0]).toMatchObject({
      execution_count: 1,
      response_bytes: new TextEncoder().encode(body).byteLength,
      measured_response_count: 1,
    }));
  });

  test('compartilha uma resposta JSON pendente sem impedir a leitura dos consumidores', async () => {
    vi.useRealTimers();
    mockFetch.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve(new Response('[{"id":1}]', { headers: { 'Content-Type': 'application/json' } })), 50);
    }));
    const url = 'https://example.invalid/rest/v1/shared_json?select=id';
    const results = await Promise.all(Array.from({ length: 10 }, async () => {
      const response = await supabaseMonitor.customFetch(url);
      return response.json();
    }));
    expect(results).toEqual(Array.from({ length: 10 }, () => [{ id: 1 }]));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('uma medição lenta não impede a resposta e libera o limite ao expirar', async () => {
    const stream = new ReadableStream<Uint8Array>({ pull() {} });
    mockFetch.mockResolvedValueOnce(new Response(stream, { headers: { 'Content-Type': 'application/json' } }));
    const response = await supabaseMonitor.customFetch('https://example.invalid/rest/v1/slow_measurement?select=id');
    expect(response).toBeInstanceOf(Response);
    expect((supabaseMonitor as any).activeBodyMeasurements).toBe(1);
    await vi.advanceTimersByTimeAsync(10000);
    expect((supabaseMonitor as any).activeBodyMeasurements).toBe(0);
  });

  test('registra uma resposta 402 sem atribuir a causa ao egress e evita alertas repetidos', async () => {
    const listener = vi.fn();
    window.addEventListener('SUPABASE_ANOMALY', listener);
    try {
      const response = new Response('{"message":"restrição"}', { status: 402 });
      mockFetch.mockResolvedValueOnce(response).mockResolvedValueOnce(new Response('', { status: 402 }));

      const actual = await supabaseMonitor.customFetch('https://example.invalid/rest/v1/items');
      await supabaseMonitor.customFetch('https://example.invalid/rest/v1/other_items');

      expect(actual).toBe(response);
      expect(await actual.text()).toBe('{"message":"restrição"}');
      expect(listener).toHaveBeenCalledTimes(1);
      expect((listener.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
        level: 'CRITICAL',
        title: 'Resposta HTTP 402 do Supabase',
        message: expect.stringContaining('pode estar relacionada ao consumo ou a pagamentos'),
      });

      await vi.advanceTimersByTimeAsync(5 * 60_000 + 1);
      mockFetch.mockResolvedValueOnce(new Response('', { status: 402 }));
      await supabaseMonitor.customFetch('https://example.invalid/rest/v1/items');
      expect(listener).toHaveBeenCalledTimes(2);
    } finally {
      window.removeEventListener('SUPABASE_ANOMALY', listener);
    }
  });

  test('não informa restrição de serviço para outras respostas de erro', async () => {
    const listener = vi.fn();
    window.addEventListener('SUPABASE_ANOMALY', listener);
    try {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 403 }));
      await supabaseMonitor.customFetch('https://example.invalid/rest/v1/items');
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('SUPABASE_ANOMALY', listener);
    }
  });
});
