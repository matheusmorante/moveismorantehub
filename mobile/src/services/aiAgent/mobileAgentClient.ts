import { supabase } from '../supabaseClient';
import { GeminiContent } from './mobileAgentTypes';

// Cliente HTTP leve e tipado para a API oficial do Google Gemini no Mobile

export class MobileAgentClient {
  public static async generateContent(payload: {
    model?: string;
    systemInstruction?: { parts: { text: string }[] };
    contents: GeminiContent[];
    tools?: any[];
    toolConfig?: any;
    temperature?: number;
  }, signal?: AbortSignal): Promise<any> {
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (error || !accessToken) throw new Error('Sessão inválida. Entre novamente.');
    const model = payload.model || 'gemini-3.8-flash';
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

    const apiBase = (process.env.EXPO_PUBLIC_ERP_API_URL || 'https://morantehub.com').replace(/\/$/, '');
    const response = await fetch(`${apiBase}/api/gemini-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ model, action: 'generateContent', payload: body }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Erro na API Gemini (${response.status}): ${errorBody || response.statusText}`
      );
    }

    return response.json();
  }
}
