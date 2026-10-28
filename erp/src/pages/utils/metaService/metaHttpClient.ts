import { getSettings } from '@/pages/utils/settingsService';
import { supabase } from '@/pages/utils/supabaseConfig';

export const GRAPH_API_VERSION = 'v26.0';
export const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com';

let cachedPhoneStatus: {
  timestamp: number;
  phoneNumberId: string;
  data: any;
} | null = null;

const CACHE_TTL_MS = 60000; // 60 segundos

/**
 * Cliente HTTP para o proxy autenticado de Meta no servidor.
 * O token da Meta permanece no ambiente de execução server-side.
 */
export const metaHttpClient = {
  request: async (operation: string, payload: Record<string, unknown> = {}): Promise<Response> => {
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (error || !accessToken) throw new Error('Sessão inválida. Entre novamente.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      return await fetch('/api/meta-graph', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...payload, operation }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * Consulta os dados e o status de verificação do número remetente no WhatsApp Cloud API.
   * Utiliza cache curto em memória (60s) para evitar requisições redundantes.
   */
  getSenderPhoneStatus: async (config?: any, forceRefresh: boolean = false) => {
    const targetConfig = config || getSettings().whatsappConfig;
    if (!targetConfig?.phoneNumberId) {
      return null;
    }

    const now = Date.now();
    if (
      !forceRefresh &&
      cachedPhoneStatus &&
      cachedPhoneStatus.phoneNumberId === targetConfig.phoneNumberId &&
      now - cachedPhoneStatus.timestamp < CACHE_TTL_MS
    ) {
      return cachedPhoneStatus.data;
    }

    try {
      const response = await metaHttpClient.request('sender_status', {
        phoneNumberId: targetConfig.phoneNumberId,
      });

      const data = await response.json();
      if (data.error) {
        return null;
      }

      cachedPhoneStatus = {
        timestamp: now,
        phoneNumberId: targetConfig.phoneNumberId,
        data,
      };

      return data;
    } catch {
      return null;
    }
  },

  clearPhoneStatusCache: () => {
    cachedPhoneStatus = null;
  },

  testConnection: async (config?: any) => {
    const targetConfig = config || getSettings().whatsappConfig;
    if (!targetConfig?.phoneNumberId) {
      throw new Error('Phone Number ID não configurado.');
    }
    const response = await metaHttpClient.request('connection_test', {
      phoneNumberId: targetConfig.phoneNumberId,
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    cachedPhoneStatus = {
      timestamp: Date.now(),
      phoneNumberId: targetConfig.phoneNumberId,
      data,
    };

    return data;
  },

  postMessages: async (payload: any, purpose: string = 'sales') => {
    if (!getSettings().whatsappConfig?.phoneNumberId) {
      throw new Error('Phone Number ID não configurado.');
    }
    return metaHttpClient.request('send_message', { payload, purpose });
  },
};
