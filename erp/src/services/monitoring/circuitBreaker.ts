import { CircuitState, OperationType, SupabaseAnomalyEvent, GUARD_CONFIG } from './types';

export class CircuitBreaker {
  private globalHitCounter: number[] = [];
  private hitCounters: Map<string, number[]> = new Map();
  private circuitStates: Map<string, { state: CircuitState, expiresAt: number }> = new Map();
  private emitAnomaly: (event: SupabaseAnomalyEvent) => void;

  constructor(emitAnomaly: (event: SupabaseAnomalyEvent) => void) {
    this.emitAnomaly = emitAnomaly;
  }

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

  public check(fingerprint: string, operationType: OperationType): boolean {
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

  public onSuccess(fingerprint: string) {
    if (this.circuitStates.get(fingerprint)?.state === 'HALF_OPEN') {
      this.circuitStates.delete(fingerprint); // Fechado
    }
  }
}
