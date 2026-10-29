import { CircuitState, OperationType, SupabaseAnomalyEvent, GUARD_CONFIG } from './types';

export class CircuitBreaker {
  private globalHitCounter: number[] = [];
  private hitCounters: Map<string, number[]> = new Map();
  private circuitStates: Map<string, { state: CircuitState; expiresAt: number; probeInFlight?: boolean }> = new Map();
  private globalAlertActive = false;
  private emitAnomaly: (event: SupabaseAnomalyEvent) => void;

  constructor(emitAnomaly: (event: SupabaseAnomalyEvent) => void) {
    this.emitAnomaly = emitAnomaly;
  }

  private cleanOldHits(now: number) {
    const windowStart = now - GUARD_CONFIG.WINDOW_MS;

    // Limpar global
    this.globalHitCounter = this.globalHitCounter.filter((t) => t > windowStart);
    if (this.globalHitCounter.length < GUARD_CONFIG.GLOBAL_KILL_SWITCH) {
      this.globalAlertActive = false;
    }

    // Limpar per fingerprint
    for (const [fp, hits] of this.hitCounters.entries()) {
      const validHits = hits.filter((t) => t > windowStart);
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

  public check(
    fingerprint: string,
    operationType: OperationType,
    context?: { module: string; screen: string; action: string; table_name: string }
  ): boolean {
    const now = Date.now();
    this.cleanOldHits(now);

    const circuit = this.circuitStates.get(fingerprint);
    if (circuit?.state === 'OPEN' || circuit?.probeInFlight) return false;

    // Tentativas já bloqueadas não representam tráfego enviado.
    if (operationType === 'SELECT' && this.globalHitCounter.length >= GUARD_CONFIG.GLOBAL_KILL_SWITCH) {
      if (!this.globalAlertActive) {
        this.globalAlertActive = true;
        this.emitAnomaly({
          level: 'CRITICAL',
          title: 'Emergency Kill Switch Ativado',
          message: `${this.globalHitCounter.length} requisições liberadas para envio em ${GUARD_CONFIG.WINDOW_MS / 1000} segundos neste navegador. Novas leituras aguardam.`,
          metric: context && { ...context, operation_type: operationType, execution_count: this.globalHitCounter.length, total_duration_ms: 0, rows_returned: 0 },
        });
      }
      return false;
    }

    const hits = this.hitCounters.get(fingerprint) || [];
    const maxLimit =
      operationType === 'SELECT' ? GUARD_CONFIG.MAX_READ_REQUESTS : GUARD_CONFIG.MAX_WRITE_REQUESTS;

    if (hits.length >= maxLimit) {
      this.circuitStates.set(fingerprint, {
        state: 'OPEN',
        expiresAt: now + GUARD_CONFIG.COOLDOWN_MS,
      });
      this.emitAnomaly({
        level: 'CRITICAL',
        title: 'Circuit Breaker Acionado',
        message: `Possível repetição excessiva (${hits.length} chamadas liberadas para envio em ${GUARD_CONFIG.WINDOW_MS / 1000} segundos). Operação pausada por ${GUARD_CONFIG.COOLDOWN_MS / 1000} segundos.`,
        metric: context && { ...context, operation_type: operationType, execution_count: hits.length, total_duration_ms: 0, rows_returned: 0 },
      });
      return false;
    }

    if (circuit?.state === 'HALF_OPEN') circuit.probeInFlight = true;
    hits.push(now);
    this.hitCounters.set(fingerprint, hits);
    this.globalHitCounter.push(now);
    return true;
  }

  public onSuccess(fingerprint: string) {
    if (this.circuitStates.get(fingerprint)?.state === 'HALF_OPEN') {
      this.circuitStates.delete(fingerprint); // Fechado
    }
  }

  public onFailure(fingerprint: string) {
    if (this.circuitStates.get(fingerprint)?.state === 'HALF_OPEN') {
      this.circuitStates.set(fingerprint, {
        state: 'OPEN',
        expiresAt: Date.now() + GUARD_CONFIG.COOLDOWN_MS,
      });
    }
  }
}
