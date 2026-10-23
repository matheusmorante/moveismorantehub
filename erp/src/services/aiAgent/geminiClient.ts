import { ApiUsageGuard } from '../apiMonitoring/apiUsageGuard';
import { ApiUsageTracker } from '../apiMonitoring/apiUsageTracker';
import { supabase } from '../../pages/utils/supabaseConfig';
import { GeminiContent, GeminiTool, GeminiToolConfig } from './geminiAgentTypes';

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
    payload: GeminiGenerateRequest
  ): Promise<GeminiGenerateResponse> {
    if (customTransport) {
      return customTransport(payload);
    }

    const guard = await ApiUsageGuard.check('gemini_flash');
    if (!guard.allowed) {
      throw new Error(`[ApiUsageGuard] Chamada bloqueada: ${guard.reason}`);
    }

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

    let res: Response;
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) throw new Error('Sessão inválida. Entre novamente.');
      res = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ model, action: 'generateContent', payload: bodyData }),
      });
    } catch (networkErr: any) {
      ApiUsageTracker.record({
        provider: 'gemini',
        service: 'gemini_flash',
        operation: 'generateContent',
        units: 1,
        status: 'ERROR',
        response_time_ms: Date.now() - startTime,
        module_source: 'financial',
        error_message: networkErr.message,
      });
      throw networkErr;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed?.error?.message || errorMsg;
      } catch {
        /* no-op: intencionalmente silencioso */
      }

      ApiUsageTracker.record({
        provider: 'gemini',
        service: 'gemini_flash',
        operation: 'generateContent',
        units: 1,
        status: res.status === 429 ? 'RATE_LIMITED' : 'ERROR',
        http_status: res.status,
        response_time_ms: Date.now() - startTime,
        module_source: 'financial',
        error_message: errorMsg,
      });

      throw new Error(`Erro na API Gemini: ${errorMsg}`);
    }

    ApiUsageTracker.record({
      provider: 'gemini',
      service: 'gemini_flash',
      operation: 'generateContent',
      units: 1,
      status: 'SUCCESS',
      http_status: 200,
      response_time_ms: Date.now() - startTime,
      module_source: 'financial',
    });

    return await res.json();
  }
}
