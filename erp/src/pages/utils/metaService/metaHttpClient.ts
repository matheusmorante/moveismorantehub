import { getSettings } from '@/pages/utils/settingsService';

export const GRAPH_API_VERSION = 'v26.0';
export const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com';

let cachedPhoneStatus: {
  timestamp: number;
  phoneNumberId: string;
  data: any;
} | null = null;

const CACHE_TTL_MS = 60000; // 60 segundos

/**
 * Cliente HTTP base para comunicação autenticada com a Facebook Graph API / WhatsApp Cloud API.
 * Centraliza versionamento de endpoint, montagem de headers de autorização e teste de conexão.
 */
export const metaHttpClient = {
  getHeaders: (config?: any): Record<string, string> => {
    const targetConfig = config || getSettings().whatsappConfig;
    if (!targetConfig?.accessToken) {
      throw new Error('Token de acesso do WhatsApp/Meta não configurado.');
    }
    return {
      Authorization: `Bearer ${targetConfig.accessToken}`,
      'Content-Type': 'application/json',
    };
  },

  /**
   * Consulta os dados e o status de verificação do número remetente no WhatsApp Cloud API.
   * Utiliza cache curto em memória (60s) para evitar requisições redundantes.
   */
  getSenderPhoneStatus: async (config?: any, forceRefresh: boolean = false) => {
    const targetConfig = config || getSettings().whatsappConfig;
    if (!targetConfig?.phoneNumberId || !targetConfig?.accessToken) {
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
      const response = await fetch(
        `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${targetConfig.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status,status,quality_score,messaging_limit_tier`,
        {
          headers: metaHttpClient.getHeaders(targetConfig),
        }
      );

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
    if (!targetConfig?.accessToken) {
      throw new Error('Token de acesso não configurado.');
    }

    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${targetConfig.phoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status,status,quality_score,messaging_limit_tier`,
      {
        headers: metaHttpClient.getHeaders(targetConfig),
      }
    );

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

  postMessages: async (payload: any, config?: any) => {
    const targetConfig = config || getSettings().whatsappConfig;
    if (!targetConfig?.phoneNumberId) {
      throw new Error('Phone Number ID não configurado.');
    }

    return fetch(
      `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${targetConfig.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: metaHttpClient.getHeaders(targetConfig),
        body: JSON.stringify(payload),
      }
    );
  },
};
