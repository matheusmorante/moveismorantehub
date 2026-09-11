import { getSettings } from '@/pages/utils/settingsService';
import { ApiUsageGuard } from "@/services/apiMonitoring/apiUsageGuard";
import { ApiUsageTracker } from "@/services/apiMonitoring/apiUsageTracker";

export const GRAPH_API_VERSION = 'v18.0';
export const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com';

/**
 * Cliente HTTP base para comunicação autenticada com o Facebook Graph API / WhatsApp Cloud API.
 * Extraído para centralizar chamadas de rede e monitoramento de cota.
 */
export const whatsappHttpClient = {
    getHeaders: () => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.accessToken) {
            throw new Error("Token de acesso do WhatsApp não configurado.");
        }
        return {
            'Authorization': `Bearer ${whatsappConfig.accessToken}`,
            'Content-Type': 'application/json'
        };
    },

    testConnection: async (config?: any) => {
        const targetConfig = config || getSettings().whatsappConfig;
        if (!targetConfig?.phoneNumberId) throw new Error("Phone Number ID não configurado.");
        if (!targetConfig?.accessToken) throw new Error("Token de acesso não configurado.");
        
        const response = await fetch(
            `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${targetConfig.phoneNumberId}`,
            { 
                headers: {
                    'Authorization': `Bearer ${targetConfig.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data;
    },

    postMessages: async (payload: any) => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.phoneNumberId) throw new Error("Phone Number ID não configurado.");

        return fetch(
            `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: whatsappHttpClient.getHeaders(),
                body: JSON.stringify(payload)
            }
        );
    }
};
