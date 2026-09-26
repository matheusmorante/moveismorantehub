import { SupabaseAnomalyEvent, OperationType, CircuitBreakerError } from './types';
import { CircuitBreaker } from './circuitBreaker';
import { TelemetryBuffer } from './telemetryBuffer';
import { AnomalyDetector } from './anomalyDetector';

class QueryGuard {
  private inFlightRequests: Map<string, Promise<Response>> = new Map();
  private circuitBreaker: CircuitBreaker;
  private telemetryBuffer: TelemetryBuffer;
  private anomalyDetector: AnomalyDetector;
  private flushFailureCount = 0;
  private nextFlushAt = 0;
  
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

    // A cada 30 segundos, verifica anomalias agregadas (herdado do monitor antigo)
    if (!this.anomalyInterval) {
      this.anomalyInterval = setInterval(() => {
        this.anomalyDetector.detectAnomalies(this.telemetryBuffer.getMetrics());
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
        const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
        
        const response = await window.fetch(`${url}/rest/v1/rpc/flush_supabase_telemetry`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apikey,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            payload: metricsToSave.map(m => ({
              ...m,
              user_id: userId,
            }))
          })
        });
        if (!response.ok) {
          this.telemetryBuffer.merge(metricsToSave);
          this.scheduleFlushBackoff();
          console.error(`[SupabaseMonitor] Falha ao salvar telemetria (HTTP ${response.status}); lote mantido para nova tentativa.`);
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
    const delayMs = Math.min(5 * 60_000 * (2 ** (this.flushFailureCount - 1)), 60 * 60_000);
    this.nextFlushAt = Date.now() + delayMs;
  }

  private getFingerprint(input: RequestInfo | URL, init?: RequestInit): string {
    const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
    const method = init?.method?.toUpperCase() || 'GET';
    
    // Ignorar coisas mutáveis na URL (ex: timestamps aleatórios se houver), mas manter path e query params
    const urlObj = new URL(urlStr);
    const pathAndQuery = `${urlObj.pathname}${urlObj.search}`;
    
    let fingerprint = `${method}:${pathAndQuery}`;

    // Para POST/PATCH em RPCs seguras, adiciona o body ao fingerprint
    if (init?.body && typeof init.body === 'string') {
      // Ignorar chaves sensíveis como senhas se necessário. Para o Supabase, os args estão no JSON.
      try {
        const parsed = JSON.parse(init.body);
        // Ordenar chaves para garantir mesmo fingerprint independente da ordem
        const keys = Object.keys(parsed).sort();
        const stableBody = keys.reduce((acc, key) => {
          acc[key] = parsed[key];
          return acc;
        }, {} as Record<string, any>);
        fingerprint += `|${JSON.stringify(stableBody)}`;
      } catch (e) {
        fingerprint += `|${init.body.length}`;
      }
    }

    return fingerprint;
  }

  private getOperationType(urlStr: string, method: string): { tableName: string, operationType: OperationType } {
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

  // WRAPPER DE INTERCEPTAÇÃO (Custom Fetch com Query Guard)
  public customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
    const method = init?.method?.toUpperCase() || 'GET';

    // 1. Ignorar telemetria para não causar loop infinito
    if (urlStr.includes('supabase_telemetry') || urlStr.includes('flush_supabase_telemetry')) {
      return window.fetch(input, init);
    }

    const { tableName, operationType } = this.getOperationType(urlStr, method);
    const fingerprint = this.getFingerprint(input, init);

    // 2. Passar pelo Circuit Breaker
    if (!this.circuitBreaker.check(fingerprint, operationType)) {
      throw new CircuitBreakerError(`Requisição bloqueada pelo Query Guard (Loop Detectado). Aguarde e tente novamente.`);
    }

    // 3. Deduplicação (In-Flight Requests) apenas para SELECT
    if (operationType === 'SELECT') {
      if (this.inFlightRequests.has(fingerprint)) {
        return this.inFlightRequests.get(fingerprint)!.then(res => res.clone());
      }
    }

    const start = performance.now();
    
    // Executa a requisição real
    const fetchPromise = window.fetch(input, init).then(res => {
      // Remover do In-Flight caching
      if (operationType === 'SELECT') {
        this.inFlightRequests.delete(fingerprint);
      }
      return res;
    }).catch(err => {
      if (operationType === 'SELECT') {
        this.inFlightRequests.delete(fingerprint);
      }
      throw err;
    });

    if (operationType === 'SELECT') {
      this.inFlightRequests.set(fingerprint, fetchPromise);
    }

    // executa requisição e telemetria
      const response = await fetchPromise;
      const end = performance.now();

      // Telemetria passiva baseada no resultado
      let rowsReturned = 0;
      const contentRange = response.headers.get('Content-Range');
      if (contentRange) {
        const match = contentRange.match(/^(\d+)-(\d+)\//);
        if (match) {
          rowsReturned = (parseInt(match[2], 10) - parseInt(match[1], 10)) + 1;
        }
      }

      const currentPath = typeof window !== 'undefined' ? window.location.pathname : 'N/A';
      const callerModule = this.currentContext.module !== 'Global'
        ? this.currentContext.module
        : 'ERP';
      const callerScreen = this.currentContext.screen !== 'N/A'
        ? this.currentContext.screen
        : currentPath;
      const callerAction = this.currentContext.action !== 'N/A'
        ? this.currentContext.action
        : 'customFetch';

      this.telemetryBuffer.track({
        table_name: tableName,
        operation_type: operationType,
        duration_ms: Math.round(end - start),
        rows_returned: rowsReturned,
        module: callerModule,
        action: callerAction
      }, { ...this.currentContext, module: callerModule, screen: callerScreen, action: callerAction });

      this.circuitBreaker.onSuccess(fingerprint);

      // IMPORTANTE: precisamos clonar a resposta para quem a originou
      // pois o response body stream só pode ser lido uma vez.
      return response.clone();
    // sucesso

    // finalizado
  };
}

export const supabaseMonitor = new QueryGuard();
