// Serviço de Observabilidade do Supabase
import { supabase } from './supabaseConfig';

export type OperationType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC' | 'REALTIME' | 'STORAGE' | 'UNKNOWN';
export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';

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
  metric: AggregatedMetric;
}

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

    // A cada 30 segundos, verifica anomalias (ex: loop infinito no front)
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
      // Regra 1: Polling agressivo ou Loop (mais de 100 chamadas em < 5 minutos)
      if (metric.execution_count > 100) {
        this.emitAnomaly({
          level: 'CRITICAL',
          title: `Loop Detectado na Tabela ${metric.table_name}`,
          message: `${metric.execution_count} execuções de ${metric.operation_type} detectadas. Verifique efeitos React.`,
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
  }

  // WRAPPER DE INTERCEPTAÇÃO (Custom Fetch)
  public customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const start = performance.now();
    const response = await window.fetch(input, init);
    const end = performance.now();
    
    try {
      const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
      
      // Ignorar requisições da própria telemetria para não causar loop
      if (urlStr.includes('supabase_telemetry') || urlStr.includes('get_aggregated_telemetry')) return response;

      let tableName = 'unknown';
      let operationType: OperationType = 'UNKNOWN';
      let rowsReturned = 0;

      // Detectar Tabela/Endpoint e Operação
      if (urlStr.includes('/rest/v1/')) {
        tableName = urlStr.split('/rest/v1/')[1]?.split('?')[0] || 'unknown';
        const method = init?.method?.toUpperCase() || 'GET';
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

      // Estimar registros retornados (usando cabeçalho Content-Range se disponível)
      // Content-Range: 0-9/153
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
              // Extrair Função (Ação)
              const match = line.match(/at\s+(?:async\s+)?([^\s]+)\s+\(/);
              if (match && match[1]) {
                callerAction = match[1];
              }
              // Extrair Módulo (Baseado na pasta)
              const fileMatch = line.match(/\/pages\/App\/([^\/]+)\//);
              if (fileMatch && fileMatch[1]) {
                callerModule = fileMatch[1];
              }
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
    } catch (e) {
      // Fallback silently
    }

    return response;
  };
}

export const supabaseMonitor = new SupabaseMonitorService();
