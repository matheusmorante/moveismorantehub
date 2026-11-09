import { supabase } from '../supabaseClient';
import { GeminiContent } from './mobileAgentTypes';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { buildOpenAiAgentRequest, parseOpenAiAgentResponse } from '../../../../shared-utils/openAiAgentAdapter';

interface GenerateContentPayload {
  model?: string;
  systemInstruction?: { parts: { text: string }[] };
  contents: GeminiContent[];
  tools?: any[];
  toolConfig?: any;
  temperature?: number;
}

const interruptedError = () => Object.assign(new Error('Solicitação de IA interrompida.'), {
  name: 'AbortError',
});

// Adaptador HTTP leve para manter o contrato do agente e usar o GPT-6 Luna no mobile.

export class MobileAgentClient {
  public static async generateContent(payload: GenerateContentPayload, signal?: AbortSignal): Promise<any> {
    const controller = new AbortController();
    let rejectAborted: (reason: Error) => void = () => {};
    const aborted = new Promise<never>((_, reject) => { rejectAborted = reject; });
    const onAbort = () => {
      controller.abort();
      rejectAborted(interruptedError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      if (signal?.aborted) throw interruptedError();
      // Margem sobre os 45 s do proxy, incluindo sessão e leitura do corpo.
      const result = await withTimeout(
        Promise.race([
          this.requestContent(payload, controller.signal).then((data) => ({ data })),
          aborted,
        ]),
        60_000,
        null,
        'ia-mobile:geracao'
      );
      if (!result) throw new Error('A resposta da IA demorou demais. Tente novamente.');
      return result.data;
    } finally {
      signal?.removeEventListener('abort', onAbort);
      controller.abort();
    }
  }

  private static async requestContent(payload: GenerateContentPayload, signal: AbortSignal): Promise<any> {
    const { data, error } = await supabase.auth.getSession();
    if (signal.aborted) throw interruptedError();
    const accessToken = data.session?.access_token;
    if (error || !accessToken) throw new Error('Sessão inválida. Entre novamente.');
    const body: Record<string, any> = {
      contents: payload.contents,
      generationConfig: {
        temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.1,
        maxOutputTokens: 2048,
      },
    };

    if (payload.systemInstruction) {
      body.systemInstruction = payload.systemInstruction;
    }
    if (payload.tools && payload.tools.length > 0) {
      body.tools = payload.tools;
    }
    if (payload.toolConfig) {
      body.toolConfig = payload.toolConfig;
    }

    const apiBase = (process.env.EXPO_PUBLIC_ERP_API_URL || 'https://morantehub.vercel.app').replace(/\/$/, '');
    const response = await fetch(`${apiBase}/api/openai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'responses',
        request: buildOpenAiAgentRequest({ ...payload, ...body }),
        moduleSource: 'mobile_agent',
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Erro na API OpenAI (${response.status}).`);
    }

    return parseOpenAiAgentResponse(await response.json());
  }
}
