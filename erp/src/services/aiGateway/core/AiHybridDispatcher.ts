import { processFinancialInput, validateParsedIntent } from '../../../../../mobile/src/services/financial/financialIntentValidator';
import { AiLatencyTracker } from './AiLatencyTracker';

export interface HybridDispatchResult {
  source: 'LOCAL_FAST_PATH' | 'GEMINI_FALLBACK';
  intent: 'create_product' | 'create_service' | 'create_order' | 'create_transaction' | 'chat';
  status: 'ready' | 'incomplete';
  summary: string;
  data: any;
  e2eLatencyMs: number;
  confidence: number;
}

export class AiHybridDispatcher {
  /**
   * Avalia a mensagem com o parser determinístico local antes de acionar a IA em nuvem.
   * Se a intenção for clara e com alta confiança, retorna em < 15ms.
   */
  public static async dispatchIntent(
    message: string,
    context?: any,
    geminiCaller?: (prompt: string) => Promise<any>
  ): Promise<HybridDispatchResult> {
    const startTime = Date.now();
    const cleanMsg = message.trim();
    const todayStr = new Date().toISOString().split('T')[0];
    const lower = cleanMsg.toLowerCase();

    // 1. Se houver contexto de ajuste/correção (ex: "na verdade foi 180", "não era 200, era 180")
    const allNumberMatches = Array.from(lower.matchAll(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/g));
    if ((lower.includes('na verdade') || lower.includes('corrig') || lower.includes('era') || lower.includes('muda') || lower.includes('troca')) && allNumberMatches.length > 0 && context) {
      const lastMatch = allNumberMatches[allNumberMatches.length - 1];
      const newAmount = parseFloat(lastMatch[1].replace(',', '.'));
      const durationMs = Date.now() - startTime;
      return {
        source: 'LOCAL_FAST_PATH',
        intent: 'create_transaction',
        status: 'ready',
        summary: `Ajustei o valor para R$ ${newAmount.toFixed(2)}.`,
        data: {
          ...context,
          amount: newAmount,
        },
        e2eLatencyMs: durationMs,
        confidence: 0.95,
      };
    }

    // 2. Tentar Fast-Path Local para Movimentações Financeiras
    const localFinancial = processFinancialInput(cleanMsg, todayStr);
    const draft = localFinancial.draft;

    if (draft && (draft.amount || draft.batchDraftsList?.length || draft.description)) {
      const isBatch = Boolean(draft.batchDraftsList && draft.batchDraftsList.length >= 2);
      const isCompleteSingle = Boolean(
        draft.amount &&
        draft.description &&
        draft.paymentMethod &&
        draft.paymentMethod !== 'UNKNOWN' &&
        draft.paymentMethod !== 'UNKNOWN_BY_USER'
      );

      const isReady = Boolean(isCompleteSingle && !draft.missingFields?.length);
      const summary = draft.questionToUser || (isReady
        ? `Identifiquei uma ${draft.type === 'income' ? 'entrada' : 'saída'} de R$ ${draft.amount?.toFixed(2)} (${draft.description} via ${draft.paymentMethod}). Deseja confirmar?`
        : `Identifiquei ${draft.description || 'uma movimentação'}. ${draft.questionToUser || 'Faltam detalhes.'}`
      );

      const durationMs = Date.now() - startTime;
      AiLatencyTracker.startCall('fast_path_financial', 'local-deterministic', 'TEXT');

      return {
        source: 'LOCAL_FAST_PATH',
        intent: 'create_transaction',
        status: isReady ? 'ready' : 'incomplete',
        summary,
        data: {
          type: draft.type || 'expense',
          amount: draft.amount || 0,
          description: draft.description || 'Movimentação',
          category: draft.categoryName || 'Geral',
          payment_method: draft.paymentMethod || 'Dinheiro',
          date: draft.date || todayStr,
          batchDraftsList: draft.batchDraftsList || null,
          isRealized: draft.isRealized ?? false,
        },
        e2eLatencyMs: durationMs,
        confidence: 0.98,
      };
    }

    // 3. Fallback para o Gemini quando a linguagem for complexa ou ambígua
    if (geminiCaller) {
      const geminiRes = await geminiCaller(cleanMsg);
      const durationMs = Date.now() - startTime;
      return {
        source: 'GEMINI_FALLBACK',
        intent: geminiRes.intent || 'chat',
        status: geminiRes.status || 'ready',
        summary: geminiRes.summary || 'Processado com sucesso.',
        data: geminiRes.data || {},
        e2eLatencyMs: durationMs,
        confidence: 0.85,
      };
    }

    return {
      source: 'LOCAL_FAST_PATH',
      intent: 'chat',
      status: 'ready',
      summary: 'Como posso te ajudar hoje?',
      data: {},
      e2eLatencyMs: Date.now() - startTime,
      confidence: 0.50,
    };
  }
}
