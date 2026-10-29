import { SupabaseAnomalyEvent, OperationType, CircuitBreakerError, GUARD_CONFIG } from './types';
import { CircuitBreaker } from './circuitBreaker';
import { TelemetryBuffer } from './telemetryBuffer';
import { AnomalyDetector } from './anomalyDetector';
import { withTimeout } from '../../../../shared-utils/withTimeout';

class QueryGuard {
  private inFlightRequests: Map<string, Promise<Response>> = new Map();
  private circuitBreaker: CircuitBreaker;
  private telemetryBuffer: TelemetryBuffer;
  private anomalyDetector: AnomalyDetector;
  private flushFailureCount = 0;
  private nextFlushAt = 0;
  private uniqueFingerprint = 0;
  private activeBodyMeasurements = 0;
  private lastServiceRestrictionAt: number | null = null;

  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private anomalyInterval: ReturnType<typeof setInterval> | null = null;

  public currentContext = {
    module: 'Global',
    screen: 'N/A',
    action: 'N/A',
  };

  constructor() {
    this.circuitBreaker = new CircuitBreaker(this.emitAnomaly.bind(this));
    this.telemetryBuffer = new TelemetryBuffer();
    this.anomalyDetector = new AnomalyDetector(this.emitAnomaly.bind(this));

    this.startTimers();
  }

  public setContext(module: string, screen: string = 'N/A', action: string = 'N/A') {
    this.currentContext = { module, screen, action };
  }

  private emitAnomaly(anomaly: SupabaseAnomalyEvent) {
    const event = new CustomEvent('SUPABASE_ANOMALY', { detail: anomaly });
    window.dispatchEvent(event);
    if (import.meta.env.MODE === 'development') {
      console.error(`[QueryGuard] ${anomaly.title}: ${anomaly.message}`, anomaly);
    }
  }

  private startTimers() {
    // A cada 5 minutos, salva os dados agregados no Supabase e limpa o buffer local
    if (!this.flushInterval) {
      this.flushInterval = setInterval(() => this.flush(), 300000);
    }

    // Descarta janelas sem atividade; as anomalias são verificadas em cada resposta.
    if (!this.anomalyInterval) {
      this.anomalyInterval = setInterval(() => {
        this.anomalyDetector.prune();
      }, 30000);
    }
  }

  public async flush() {
    if (Date.now() < this.nextFlushAt) return;

    const metricsToSave = this.telemetryBuffer.getAndClear();
    if (metricsToSave.length === 0) return;

    try {
      // Usamos o objeto fetch original global para NÃO causar loop infinito de tracking
      const userStr = localStorage.getItem('sb-hkoxhourxwlddgsfdgws-auth-token');
      let userId = null;
      let token = null;
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          userId = parsed.user?.id;
          token = parsed.access_token;
        } catch {
          // Token malformado ou inválido no storage local, ignora
        }
      }

      if (token && userId) {
        const url = import.meta.env.VITE_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
        const apikey =
          import.meta.env.VITE_SUPABASE_ANON_KEY ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

        const controller = new AbortController();
        const response = await withTimeout<Response | null>(window.fetch(`${url}/rest/v1/rpc/flush_supabase_telemetry`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            apikey: apikey,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            payload: metricsToSave.map((m) => ({
              ...m,
              user_id: userId,
            })),
          }),
        }), 10000, null, 'envio de telemetria');
        controller.abort();
        if (!response) throw new Error('Tempo de envio da telemetria esgotado.');
        if (!response.ok) {
          this.telemetryBuffer.merge(metricsToSave);
          this.scheduleFlushBackoff();
          console.error(
            `[SupabaseMonitor] Falha ao salvar telemetria (HTTP ${response.status}); lote mantido para nova tentativa.`
          );
        } else {
          this.flushFailureCount = 0;
          this.nextFlushAt = 0;
        }
      } else {
        this.telemetryBuffer.merge(metricsToSave);
      }
    } catch (err) {
      this.telemetryBuffer.merge(metricsToSave);
      this.scheduleFlushBackoff();
      console.error('[SupabaseMonitor] Falha ao enviar telemetria:', err);
    }
  }

  private scheduleFlushBackoff() {
    this.flushFailureCount += 1;
    const delayMs = Math.min(5 * 60_000 * 2 ** (this.flushFailureCount - 1), 60 * 60_000);
    this.nextFlushAt = Date.now() + delayMs;
  }

  private async getFingerprint(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
    const urlStr =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const request = input instanceof Request ? input : undefined;
    const method = (init?.method || request?.method || 'GET').toUpperCase();
    const headers = new Headers(request?.headers);
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));

    // Nunca usar o corpo ou os parâmetros em um evento/log. Quando não for
    // possível gerar uma chave segura, não compartilhar a requisição.
    if (!globalThis.crypto?.subtle || (init?.body && typeof init.body !== 'string') ||
        (request && request.body && init?.body === undefined)) {
      return `unique:${++this.uniqueFingerprint}`;
    }
    try {
      const material = JSON.stringify([
        method, urlStr, Array.from(headers.entries()),
        init?.body || '', init?.credentials || request?.credentials || '',
        init?.mode || request?.mode || '', init?.cache || request?.cache || '',
        init?.redirect || request?.redirect || '', init?.referrer || request?.referrer || '',
        init?.referrerPolicy || request?.referrerPolicy || '', init?.integrity || request?.integrity || '',
      ]);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    } catch {
      return `unique:${++this.uniqueFingerprint}`;
    }
  }

  private getOperationType(
    urlStr: string,
    method: string
  ): { tableName: string; operationType: OperationType } {
    let tableName = 'unknown';
    let operationType: OperationType = 'UNKNOWN';

    if (urlStr.includes('/rest/v1/rpc/')) {
      tableName = urlStr.split('/rest/v1/rpc/')[1]?.split('?')[0] || 'unknown_rpc';
      operationType = 'RPC';
    } else if (urlStr.includes('/rest/v1/')) {
      tableName = urlStr.split('/rest/v1/')[1]?.split('?')[0] || 'unknown';
      if (method === 'GET') operationType = 'SELECT';
      else if (method === 'POST') operationType = 'INSERT';
      else if (method === 'PATCH') operationType = 'UPDATE';
      else if (method === 'DELETE') operationType = 'DELETE';
    } else if (urlStr.includes('/storage/v1/')) {
      tableName = urlStr.split('/storage/v1/')[1]?.split('/')[0] || 'storage';
      operationType = 'STORAGE';
    } else if (urlStr.includes('/realtime/v1/')) {
      tableName = 'websocket';
      operationType = 'REALTIME';
    }

    return { tableName, operationType };
  }

  private async measureJsonResponse(response: Response): Promise<number | undefined> {
    if (!response.body || this.activeBodyMeasurements >= 2 ||
        !response.headers.get('Content-Type')?.toLowerCase().includes('json')) return undefined;

    this.activeBodyMeasurements += 1;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      reader = response.clone().body?.getReader();
      if (!reader) return undefined;
      const read = async () => {
        let bytes = 0;
        while (bytes <= GUARD_CONFIG.MAX_WINDOW_RESPONSE_BYTES) {
          const chunk = await reader!.read();
          if (chunk.done) return bytes;
          bytes += chunk.value.byteLength;
        }
        return bytes;
      };
      const timeout = new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), 10000); });
      return await Promise.race([read(), timeout]);
    } catch {
      return undefined;
    } finally {
      if (timer) clearTimeout(timer);
      if (reader) void reader.cancel().catch(() => {});
      this.activeBodyMeasurements -= 1;
    }
  }

  // WRAPPER DE INTERCEPTAÇÃO (Custom Fetch com Query Guard)
  public customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const request = input instanceof Request ? input : undefined;
    const method = (init?.method || request?.method || 'GET').toUpperCase();

    // 1. Ignorar telemetria para não causar loop infinito
    if (urlStr.includes('supabase_telemetry') || urlStr.includes('get_aggregated_telemetry') ||
        urlStr.includes('supabase_mass_load_history')) {
      return window.fetch(input, init);
    }

    const { tableName, operationType } = this.getOperationType(urlStr, method);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : 'N/A';
    const context = {
      module: this.currentContext.module !== 'Global' ? this.currentContext.module : 'ERP',
      screen: this.currentContext.screen !== 'N/A' ? this.currentContext.screen : currentPath,
      action: this.currentContext.action !== 'N/A' ? this.currentContext.action : method + ' ' + tableName,
      table_name: tableName,
    };
    const fingerprint = await this.getFingerprint(input, init);
    const canDeduplicate = operationType === 'SELECT' && !init?.signal && !request?.signal;

    // Deduplicate SELECTs before counting them. Only outgoing requests should
    // consume the loop budget; multiple callers sharing one in-flight read do
    // not create additional Supabase traffic.
    if (canDeduplicate) {
      const inFlight = this.inFlightRequests.get(fingerprint);
      if (inFlight) return inFlight.then((res) => res.clone());
    }

    // 2. Passar pelo Circuit Breaker
    if (!this.circuitBreaker.check(fingerprint, operationType, context)) {
      throw new CircuitBreakerError(
        `Requisição bloqueada pelo Query Guard (Loop Detectado). Aguarde e tente novamente.`
      );
    }

    const start = performance.now();

    // Executa a requisição real
    const fetchPromise = window
      .fetch(input, init)
      .then((res) => {
        // Remover do In-Flight caching
        if (canDeduplicate) {
          this.inFlightRequests.delete(fingerprint);
        }
        return res;
      })
      .catch((err) => {
        if (canDeduplicate) {
          this.inFlightRequests.delete(fingerprint);
        }
        this.circuitBreaker.onFailure(fingerprint);
        throw err;
      });

    if (canDeduplicate) {
      this.inFlightRequests.set(fingerprint, fetchPromise);
    }

    // executa requisição e telemetria
    const response = await fetchPromise;
    const end = performance.now();

    // Telemetria passiva baseada no resultado
    let rowsReturned = 0;
    const contentRange = response.headers.get('Content-Range');
    let rowsCountKnown = false;
    if (contentRange) {
      const match = contentRange.match(/^(\d+)-(\d+)\//);
      if (match) {
        rowsReturned = parseInt(match[2], 10) - parseInt(match[1], 10) + 1;
        rowsCountKnown = true;
      } else if (contentRange === '*/0') {
        rowsCountKnown = true;
      }
    }
    const lengthHeader = response.headers.get('Content-Length');
    const declaredBytes = lengthHeader && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : undefined;
    const responseBytes = declaredBytes != null && Number.isSafeInteger(declaredBytes) ? declaredBytes : undefined;
    const metric = {
      ...context,
      operation_type: operationType,
      duration_ms: Math.round(end - start),
      rows_returned: rowsReturned,
      rows_count_known: rowsCountKnown,
      response_bytes: responseBytes,
    };
    const observedAt = Date.now();
    if (response.status === 402) {
      const previousRestrictionAt = this.lastServiceRestrictionAt;
      this.lastServiceRestrictionAt = observedAt;
      if (previousRestrictionAt === null || observedAt - previousRestrictionAt > GUARD_CONFIG.AGGREGATE_WINDOW_MS) {
        this.emitAnomaly({
          level: 'CRITICAL',
          title: 'Resposta HTTP 402 do Supabase',
          message: 'O Supabase retornou uma possível restrição de serviço. Ela pode estar relacionada ao consumo ou a pagamentos. Consulte o painel oficial para identificar o motivo.',
        });
      }
    }
    this.telemetryBuffer.track(metric, context);
    this.anomalyDetector.track(metric, context, observedAt);
    if (responseBytes == null && ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'RPC'].includes(operationType)) {
      void this.measureJsonResponse(response).then((bytes) => {
        if (bytes == null) return;
        this.telemetryBuffer.addMeasurement(metric, context, bytes);
        this.anomalyDetector.addMeasurement(metric, context, bytes, observedAt);
      });
    }

    if (response.ok) this.circuitBreaker.onSuccess(fingerprint);
    else this.circuitBreaker.onFailure(fingerprint);

    return response;
  };
}

export const supabaseMonitor = new QueryGuard();
