import { getSettings } from '@/pages/utils/settingsService';

const GRAPH_API_VERSION = 'v18.0';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com';

export interface WhatsAppProduct {
    id: string;
    retailer_id: string;
    name: string;
    description: string;
    price: string;
    currency: string;
    image_url: string;
    url?: string;
    visibility?: string;
    is_hidden?: boolean;
}

/**
 * Service to interact with WhatsApp Business / Facebook Graph API
 */
export const whatsappGraphService = {
    /**
     * Helper to get common headers
     */
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

    /**
     * Verifies if the basic API configuration is working
     */
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

    /**
     * Fetches products from the Meta Catalog
     */
    fetchCatalogProducts: async (): Promise<WhatsAppProduct[]> => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.catalogId) {
            console.error("Catalog ID não configurado.");
            return [];
        }

        try {
            const response = await fetch(
                `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.catalogId}/products?fields=id,retailer_id,name,description,price,currency,image_url,url,visibility,is_hidden`,
                { headers: whatsappGraphService.getHeaders() }
            );

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            // Filter out products that are hidden (usually 'staging' visibility means hidden)
            // 'published' is the standard for visible products
            const products = data.data || [];
            return products.filter((p: any) => p.visibility !== 'staging' && p.is_hidden !== true);
        } catch (error: any) {
            console.error("Erro ao carregar catálogo do WhatsApp:", error);
            // Captura detalhes específicos da API do Facebook se houver
            const metaError = error.message || "Erro desconhecido na API da Meta";
            throw new Error(`Falha ao acessar catálogo: ${metaError}`);
        }
    },

    /**
     * Syncs (Add/Update) a product to the Meta Catalog
     * Note: This usually requires a Batch Request
     */
    syncProductToCatalog: async (product: any) => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.catalogId) throw new Error("Catalog ID não configurado.");

        const batchRequest = {
            requests: [
                {
                    method: 'UPDATE',
                    retailer_id: product.id,
                    data: {
                        name: product.name,
                        description: product.description || '',
                        price: Math.round((product.price || 0) * 100), // Format in cents
                        currency: 'BRL',
                        condition: 'new',
                        availability: (product.stock > 0) ? 'in stock' : 'out of stock',
                        image_url: product.image_url,
                        brand: 'Móveis Morante'
                    }
                }
            ]
        };

        const response = await fetch(
            `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.catalogId}/batch`,
            {
                method: 'POST',
                headers: whatsappGraphService.getHeaders(),
                body: JSON.stringify(batchRequest)
            }
        );

        return response.json();
    },

    /**
     * Sends a direct text message via Cloud API
     * Note: For the first message, a template is usually required by Meta rules.
     * This is a generic implementation.
     */
    sendTextMessage: async (to: string, text: string) => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.phoneNumberId) throw new Error("Phone Number ID não configurado.");

        const cleanPhone = to.replace(/\D/g, '');
        // Ensure format: 55419...
        const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        const response = await fetch(
            `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: whatsappGraphService.getHeaders(),
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: formattedPhone,
                    type: 'text',
                    text: { body: text }
                })
            }
        );

        const data = await response.json();
        if (data.error) {
            console.error("Erro API WhatsApp:", data.error);
            throw new Error(data.error.message);
        }
        return data;
    }
};
