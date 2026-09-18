import { AggregatedMetric, SupabaseAnomalyEvent } from './types';

export class AnomalyDetector {
  private emitAnomaly: (event: SupabaseAnomalyEvent) => void;

  constructor(emitAnomaly: (event: SupabaseAnomalyEvent) => void) {
    this.emitAnomaly = emitAnomaly;
  }

  public detectAnomalies(metrics: AggregatedMetric[]) {
    metrics.forEach((metric) => {
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
}
