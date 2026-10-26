import { ApiUsageGuard } from '../apiMonitoring/apiUsageGuard';
import { ApiUsageTracker } from '../apiMonitoring/apiUsageTracker';
import { supabase } from '../../pages/utils/supabaseConfig';
import { GeminiContent, GeminiTool, GeminiToolConfig } from './geminiAgentTypes';
import { withTimeout } from '../../../../shared-utils/withTimeout';

// Cliente HTTP para a API Gemini v1beta com monitoramento de cotas e circuit breaker

export interface GeminiGenerateRequest {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  tools?: GeminiTool[];
  toolConfig?: GeminiToolConfig;
  temperature?: number;
}

export interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
}

export type GeminiTransportFn = (payload: GeminiGenerateRequest) => Promise<GeminiGenerateResponse>;

let customTransport: GeminiTransportFn | null = null;

export const setGeminiCustomTransport = (fn: GeminiTransportFn | null) => {
  customTransport = fn;
};

export class GeminiClient {
  public static async generateContent(
    payload: GeminiGenerateRequest,
    options: { signal?: AbortSignal; timeoutMs?: number } = {},
  ): Promise<GeminiGenerateResponse> {
    const model = 'gemini-3.8-flash';
    const startTime = Date.now();

    const bodyData: any = {
      contents: payload.contents,
      generationConfig: {
        temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.2,
        maxOutputTokens: 2048,
        thinkingConfig: {
          thinkingBudget: 1024,
        },
      },
    };

    if (payload.systemInstruction) bodyData.systemInstruction = payload.systemInstruction;
    if (payload.tools && payload.tools.length > 0) bodyData.tools = payload.tools;
    if (payload.toolConfig) bodyData.toolConfig = payload.toolConfig;

    const controller = new AbortController();
    const expired = Symbol('expired');
    const transport = customTransport;
    let httpStatus: number | undefined;
    let guardAllowed = false;
    const checkAborted = () => {
      if (controller.signal.aborted) {
        const error = new Error('Consulta ao assistente interrompida.');
        error.name = 'AbortError';
        throw error;
      }
    };
    let rejectAborted!: (reason: Error) => void;
    const aborted = new Promise<never>((_, reject) => { rejectAborted = reject; });
    const onAbort = () => {
      controller.abort();
      const error = new Error('Consulta ao assistente interrompida.');
      error.name = 'AbortError';
      rejectAborted(error);
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (options.signal?.aborted) onAbort();

    try {
      const request = async (): Promise<GeminiGenerateResponse> => {
        checkAborted();
        if (transport) return transport(payload);
        const guard = await ApiUsageGuard.check('gemini_flash');
        checkAborted();
        if (!guard.allowed) {
          throw new Error(`[ApiUsageGuard] Chamada bloqueada: ${guard.reason}`);
        }
        guardAllowed = true;
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        checkAborted();
        const accessToken = sessionData.session?.access_token;
        if (sessionError || !accessToken) throw new Error('Sessão inválida. Entre novamente.');
        const res = await fetch('/api/gemini-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ model, action: 'generateContent', payload: bodyData }),
          signal: controller.signal,
        });
        httpStatus = res.status;
        if (!res.ok) throw new Error(`Erro na API Gemini: HTTP ${res.status}.`);
        return await res.json().catch(() => {
          throw new Error('A API Gemini retornou uma resposta inválida.');
        });
      };
      const result = await withTimeout<GeminiGenerateResponse | typeof expired>(
        Promise.race([request(), aborted]),
        Math.max(1, Math.min(options.timeoutMs ?? 30_000, 30_000)),
        expired,
        'assistente ERP: transporte Gemini',
      );
      if (result === expired) throw new Error('A resposta do assistente excedeu o prazo.');
      checkAborted();
      if (!transport) {
        ApiUsageTracker.record({
          provider: 'gemini',
          service: 'gemini_flash',
          operation: 'generateContent',
          units: 1,
          status: 'SUCCESS',
          http_status: httpStatus,
          response_time_ms: Date.now() - startTime,
          module_source: 'financial',
        });
      }
      return result;
    } catch (error) {
      if (!transport && guardAllowed) ApiUsageTracker.record({
        provider: 'gemini',
        service: 'gemini_flash',
        operation: 'generateContent',
        units: 1,
        status: httpStatus === 429 ? 'RATE_LIMITED' : 'ERROR',
        http_status: httpStatus,
        response_time_ms: Date.now() - startTime,
        module_source: 'financial',
        error_message: httpStatus ? `Falha na consulta Gemini (HTTP ${httpStatus}).` : 'Consulta Gemini interrompida ou indisponível.',
      });
      throw error;
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
      controller.abort();
    }
  }
}
