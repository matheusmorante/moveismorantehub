import { processFinancialInput, validateParsedIntent } from '../../../../../mobile/src/services/financial/financialIntentValidator';
import type { ParsedFinancialIntent } from '../../../../../mobile/src/services/financial/financialTypes';

export interface PreAnalysisSnapshot {
  version: number;
  text: string;
  textHash: string;
  timestamp: number;
  durationMs: number;
  draft: ParsedFinancialIntent | null;
  isReady: boolean;
  source: 'LOCAL_DETERMINISTIC' | 'AI_ANTENNA';
}

export interface PreAnalysisTelemetry {
  triggeredCount: number;
  reusedHits: number;
  discardedCount: number;
  totalPreAnalysisDurationMs: number;
  avgPreAnalysisDurationMs: number;
  cacheHitRate: number;
}

export class AiPreAnalysisManager {
  private static currentVersion = 0;
  private static currentHash = '';
  private static latestSnapshot: PreAnalysisSnapshot | null = null;
  private static activeAbortController: AbortController | null = null;

  // Telemetria
  private static telemetry: PreAnalysisTelemetry = {
    triggeredCount: 0,
    reusedHits: 0,
    discardedCount: 0,
    totalPreAnalysisDurationMs: 0,
    avgPreAnalysisDurationMs: 0,
    cacheHitRate: 0,
  };

  public static generateTextHash(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Notifica alteração no texto da transcrição / digitação.
   * Incrementa a versão e invalida pré-análises assíncronas em andamento de versões anteriores.
   */
  public static onTextChange(newText: string): number {
    const newHash = this.generateTextHash(newText);
    if (newHash !== this.currentHash) {
      this.currentVersion += 1;
      this.currentHash = newHash;

      // Cancela requisição assíncrona anterior se houver
      if (this.activeAbortController) {
        this.activeAbortController.abort();
        this.activeAbortController = null;
      }

      // Se o snapshot anterior era para outro texto, marca como obsoleto
      if (this.latestSnapshot && this.latestSnapshot.textHash !== newHash) {
        this.telemetry.discardedCount += 1;
        this.latestSnapshot = null;
      }
    }
    return this.currentVersion;
  }

  /**
   * Executa a pré-análise silenciosa de 3 segundos com proteção estrita de versão.
   */
  public static async executePreAnalysis(
    text: string,
    version: number,
    todayStr = new Date().toISOString().split('T')[0]
  ): Promise<PreAnalysisSnapshot | null> {
    const cleanText = text.trim();
    if (!cleanText) return null;

    const hash = this.generateTextHash(cleanText);

    // Se já temos snapshot válido para essa versão e hash, retorna ele
    if (this.latestSnapshot && this.latestSnapshot.textHash === hash && this.latestSnapshot.version === version) {
      return this.latestSnapshot;
    }

    // Se o texto já mudou antes de começar, ignora e computa descarte
    if (version !== this.currentVersion || hash !== this.currentHash) {
      this.telemetry.discardedCount += 1;
      return null;
    }

    const startTime = Date.now();
    this.telemetry.triggeredCount += 1;

    // Fast-path determinístico local (< 5ms)
    const localResult = processFinancialInput(cleanText, todayStr);
    const durationMs = Date.now() - startTime;

    // Verificação de concorrência pós-processamento
    if (version !== this.currentVersion || hash !== this.currentHash) {
      this.telemetry.discardedCount += 1;
      return null;
    }

    const snapshot: PreAnalysisSnapshot = {
      version,
      text: cleanText,
      textHash: hash,
      timestamp: Date.now(),
      durationMs,
      draft: localResult.draft,
      isReady: Boolean(localResult.draft && localResult.draft.amount),
      source: 'LOCAL_DETERMINISTIC',
    };

    this.latestSnapshot = snapshot;
    this.telemetry.totalPreAnalysisDurationMs += durationMs;
    this.telemetry.avgPreAnalysisDurationMs =
      this.telemetry.totalPreAnalysisDurationMs / this.telemetry.triggeredCount;

    return snapshot;
  }

  /**
   * Chamado no momento do commit (clique no botão ENVIAR).
   * Verifica se há snapshot válido correspondente exatamente ao texto final.
   */
  public static commitAndConsume(
    submittedText: string
  ): { reused: boolean; snapshot: PreAnalysisSnapshot | null } {
    const submittedHash = this.generateTextHash(submittedText);

    if (this.latestSnapshot && this.latestSnapshot.textHash === submittedHash) {
      this.telemetry.reusedHits += 1;
      this.updateHitRate();
      const snapshot = this.latestSnapshot;
      this.clearSession();
      return { reused: true, snapshot };
    }

    this.updateHitRate();
    this.clearSession();
    return { reused: false, snapshot: null };
  }

  private static updateHitRate(): void {
    const totalRequests = this.telemetry.reusedHits + this.telemetry.discardedCount;
    this.telemetry.cacheHitRate =
      totalRequests > 0 ? (this.telemetry.reusedHits / totalRequests) * 100 : 0;
  }

  /**
   * Limpa o estado da sessão de pré-análise pós-envio.
   */
  public static clearSession(): void {
    this.currentVersion += 1;
    this.currentHash = '';
    this.latestSnapshot = null;
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  public static getTelemetry(): PreAnalysisTelemetry {
    return { ...this.telemetry };
  }

  public static resetTelemetry(): void {
    this.currentVersion = 0;
    this.currentHash = '';
    this.latestSnapshot = null;
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.telemetry = {
      triggeredCount: 0,
      reusedHits: 0,
      discardedCount: 0,
      totalPreAnalysisDurationMs: 0,
      avgPreAnalysisDurationMs: 0,
      cacheHitRate: 0,
    };
  }
}
