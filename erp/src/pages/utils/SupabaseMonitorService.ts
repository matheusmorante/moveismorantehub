// Serviço de Observabilidade e Guardião de Queries do Supabase (Query Guard)
import { supabase } from './supabaseConfig';

export type OperationType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC' | 'REALTIME' | 'STORAGE' | 'UNKNOWN';
export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface TelemetryEvent {
  module?: string;
  screen?: string;
  action?: string;
  table_name: string;
  operation_type: OperationType;
  duration_ms: number;
  rows_returned: number;
}

interface AggregatedMetric {
  module: string;
  screen: string;
  action: string;
  table_name: string;
  operation_type: OperationType;
  execution_count: number;
  total_duration_ms: number;
  rows_returned: number;
}

export interface SupabaseAnomalyEvent {
  level: AlertLevel;
  title: string;
  message: string;
  metric?: AggregatedMetric;
  fingerprint?: string;
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// Configurações do Guardião
const GUARD_CONFIG = {
  WINDOW_MS: 5000,           // Janela de 5 segundos para analisar loops
  MAX_READ_REQUESTS: 20,     // Mais de 20 chamadas idênticas de SELECT = OPEN
  MAX_WRITE_REQUESTS: 10,    // Mais de 10 chamadas idênticas de WRITE/RPC = OPEN
  COOLDOWN_MS: 30000,        // 30 segundos bloqueado
  GLOBAL_KILL_SWITCH: 200,   // Mais de 200 chamadas globais na janela = EMERGENCY
};

class SupabaseMonitorService {
  private buffer: Map<string, AggregatedMetric> = new Map();
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private anomalyInterval: ReturnType<typeof setInterval> | null = null;
  
  // O contexto global pode ser definido pelos componentes pai (ex: Páginas do ERP)
  public currentContext = {
    module: 'Global',
    screen: 'N/A',
    action: 'N/A',
  };

  // --- QUERY GUARD STATE ---
  private inFlightRequests: Map<string, Promise<Response>> = new Map();
  
  // Hit counter for sliding window (fingerprint -> timestamps)
  private hitCounters: Map<string, number[]> = new Map();
  
  // Global hit counter (timestamps)
  private globalHitCounter: number[] = [];

  // Circuit Breaker State per fingerprint
  private circuitStates: Map<string, { state: CircuitState, expiresAt: number }> = new Map();
  // -------------------------

  constructor() {
    this.startTimers();
  }

  public setContext(module: string, screen: string = 'N/A', action: string = 'N/A') {
    this.currentContext = { module, screen, action };
  }

  public track(event: TelemetryEvent) {
    const mod = event.module || this.currentContext.module;
    const scr = event.screen || this.currentContext.screen;
    const act = event.action || this.currentContext.action;

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

  private startTimers() {
    // A cada 5 minutos, salva os dados agregados no Supabase e limpa o buffer local
    if (!this.flushInterval) {
      this.flushInterval = setInterval(() => this.flush(), 300000);
    }

    // A cada 30 segundos, verifica anomalias agregadas (herdado do monitor antigo)
    if (!this.anomalyInterval) {
      this.anomalyInterval = setInterval(() => this.detectAnomalies(), 30000);
    }
  }

  public async flush() {
    if (this.buffer.size === 0) return;

    // Converte o mapa para array e limpa o buffer original para receber novos dados
    const metricsToSave = Array.from(this.buffer.values());
    this.buffer.clear();

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
        } catch {}
      }

      if (token && userId) {
        // Envia direto via REST API pura para não acionar o cliente Supabase modificado novamente
        const url = import.meta.env.VITE_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
        const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
        
        await window.fetch(`${url}/rest/v1/rpc/flush_supabase_telemetry`, {
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
      }
    } catch (err) {
      console.error('[SupabaseMonitor] Falha ao enviar telemetria:', err);
    }
  }

  private detectAnomalies() {
    this.buffer.forEach((metric) => {
      // Regra 1: Polling agressivo
      if (metric.execution_count > 100) {
        this.emitAnomaly({
          level: 'CRITICAL',
          title: `Loop Aggregado na Tabela ${metric.table_name}`,
          message: `${metric.execution_count} execuções de ${metric.operation_type} em 5 min.`,
          metric
        });
      }
      
      // Regra 2: Retornando dados demais
      if (metric.rows_returned > 5000) {
        this.emitAnomaly({
          level: 'WARNING',
          title: `Carga Massiva em ${metric.table_name}`,
          message: `Consulta retornou ${metric.rows_returned} registros. Requer paginação.`,
          metric
        });
      }
    });
  }

  private emitAnomaly(anomaly: SupabaseAnomalyEvent) {
    const event = new CustomEvent('SUPABASE_ANOMALY', { detail: anomaly });
    window.dispatchEvent(event);
    if (import.meta.env.MODE === 'development') {
      console.error(`[QueryGuard] ${anomaly.title}: ${anomaly.message}`, anomaly);
    }
  }

  // --- QUERY GUARD LOGIC ---
  private cleanOldHits(now: number) {
    const windowStart = now - GUARD_CONFIG.WINDOW_MS;
    
    // Limpar global
    this.globalHitCounter = this.globalHitCounter.filter(t => t > windowStart);
    
    // Limpar per fingerprint
    for (const [fp, hits] of this.hitCounters.entries()) {
      const validHits = hits.filter(t => t > windowStart);
      if (validHits.length === 0) {
        this.hitCounters.delete(fp);
      } else {
        this.hitCounters.set(fp, validHits);
      }
    }

    // Limpar Circuitos expirados
    for (const [fp, state] of this.circuitStates.entries()) {
      if (state.state === 'OPEN' && now >= state.expiresAt) {
        this.circuitStates.set(fp, { state: 'HALF_OPEN', expiresAt: 0 });
      } else if (state.state === 'CLOSED') {
        this.circuitStates.delete(fp);
      }
    }
  }

  private checkCircuitBreaker(fingerprint: string, operationType: OperationType): boolean {
    const now = Date.now();
    this.cleanOldHits(now);

    // 1. Verificar Kill Switch Global
    this.globalHitCounter.push(now);
    if (this.globalHitCounter.length > GUARD_CONFIG.GLOBAL_KILL_SWITCH) {
      if (operationType === 'SELECT') { // Prioriza preservar writes
        this.emitAnomaly({
          level: 'CRITICAL',
          title: 'Emergency Kill Switch Ativado',
          message: `Mais de ${GUARD_CONFIG.GLOBAL_KILL_SWITCH} requests em ${GUARD_CONFIG.WINDOW_MS}ms. Bloqueando leitura.`
        });
        return false; // Bloqueado
      }
    }

    // 2. Verificar estado do circuito para o fingerprint
    const circuit = this.circuitStates.get(fingerprint);
    if (circuit?.state === 'OPEN') {
      if (now >= circuit.expiresAt) {
        this.circuitStates.set(fingerprint, { state: 'HALF_OPEN', expiresAt: 0 });
        return true; // Permite passar em HALF_OPEN
      }
      return false; // Bloqueado
    }

    // Se HALF_OPEN e estamos chamando agora, não bloqueamos AINDA.
    // A validação de falha ou sucesso no HALF_OPEN ocorrerá ao observar se o loop volta.

    // 3. Adicionar hit
    let hits = this.hitCounters.get(fingerprint) || [];
    hits.push(now);
    this.hitCounters.set(fingerprint, hits);

    // 4. Validar limites
    const maxLimit = (operationType === 'SELECT') ? GUARD_CONFIG.MAX_READ_REQUESTS : GUARD_CONFIG.MAX_WRITE_REQUESTS;
    
    if (hits.length > maxLimit) {
      // Abre o circuito
      this.circuitStates.set(fingerprint, { state: 'OPEN', expiresAt: now + GUARD_CONFIG.COOLDOWN_MS });
      this.emitAnomaly({
        level: 'CRITICAL',
        title: 'Circuit Breaker Acionado',
        message: `Loop detectado (${hits.length} chamadas). Operação bloqueada por ${GUARD_CONFIG.COOLDOWN_MS}ms.`,
        fingerprint
      });
      return false; // Bloqueado
    }

    return true; // Permitido
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

    if (urlStr.includes('/rest/v1/')) {
      tableName = urlStr.split('/rest/v1/')[1]?.split('?')[0] || 'unknown';
      if (method === 'GET') operationType = 'SELECT';
      else if (method === 'POST') operationType = 'INSERT';
      else if (method === 'PATCH') operationType = 'UPDATE';
      else if (method === 'DELETE') operationType = 'DELETE';
    } else if (urlStr.includes('/rest/v1/rpc/')) {
      tableName = urlStr.split('/rest/v1/rpc/')[1]?.split('?')[0] || 'unknown_rpc';
      operationType = 'RPC';
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
    if (!this.checkCircuitBreaker(fingerprint, operationType)) {
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

    try {
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

      let callerAction = 'N/A';
      let callerModule = 'Global';
      try {
        const stack = new Error().stack;
        if (stack) {
          const lines = stack.split('\n');
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.includes('SupabaseMonitorService') && !line.includes('@supabase') && !line.includes('supabaseConfig')) {
              const match = line.match(/at\s+(?:async\s+)?([^\s]+)\s+\(/);
              if (match && match[1]) callerAction = match[1];
              const fileMatch = line.match(/\/pages\/App\/([^\/]+)\//);
              if (fileMatch && fileMatch[1]) callerModule = fileMatch[1];
              break;
            }
          }
        }
      } catch (e) {}

      this.track({
        table_name: tableName,
        operation_type: operationType,
        duration_ms: Math.round(end - start),
        rows_returned: rowsReturned,
        module: callerModule,
        action: callerAction
      });

      // Se passou aqui, e o circuito estava HALF_OPEN, significa que a requisição teve sucesso e não estourou logo em seguida.
      // A própria lógica do sliding window vai fechar o circuito naturalmente, ou podemos forçar o CLOSE se quisermos ser explícitos.
      if (this.circuitStates.get(fingerprint)?.state === 'HALF_OPEN') {
        this.circuitStates.delete(fingerprint); // Fechado
      }

      // IMPORTANTE: precisamos clonar a resposta para quem a originou
      // pois o response body stream só pode ser lido uma vez.
      return response.clone();
    } catch (e) {
      throw e;
    }
  };
}

export const supabaseMonitor = new SupabaseMonitorService();
