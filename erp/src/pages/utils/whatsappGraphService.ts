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
            if (!response.ok || data.error) {
                console.error("[WhatsAppService] Erro Meta API:", data.error || data);
                throw new Error(data.error?.message || `Erro HTTP ${response.status}`);
            }
            
            const products = data.data || [];
            return products.filter((p: any) => p.visibility !== 'staging' && p.is_hidden !== true);
        } catch (error: any) {
            console.error("Erro ao carregar catálogo do WhatsApp:", error);
            const metaError = error.message || "Erro desconhecido na API da Meta";
            throw new Error(`Falha ao acessar catálogo: ${metaError}`);
        }
    },

    /**
     * Syncs (Add/Update) a product to the Meta Catalog
     * Note: This usually requires a Batch Request
     */
    syncProductToCatalog: async (product: any, action: 'UPDATE' | 'DELETE' = 'UPDATE') => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.catalogId) throw new Error("Catalog ID não configurado.");

        // Preço limpo para Meta (em centavos, sem decimais) — suporta camelCase e snake_case
        const rawPrice = product.unitPrice ?? product.unit_price ?? product.price ?? 0;
        const priceCents = Math.round(Number(rawPrice) * 100);
        
        const batchRequest = {
            requests: [
                {
                    method: action,
                    retailer_id: product.code || product.sku || product.id,
                    data: action === 'UPDATE' ? {
                        name: product.description || product.name,
                        description: product.whatsappDescription || product.description || product.name,
                        price: priceCents,
                        currency: 'BRL',
                        condition: product.condition === 'usado' ? 'used' : 'new',
                        availability: (product.stock > 0 && product.active) ? 'in stock' : 'out of stock',
                        image_url: product.images?.[0] || product.image_url,
                        brand: product.brand || 'Móveis Morante',
                        url: `https://moveismorante.com.br/p/${product.id}`, // Placeholder URL
                        category: product.groupName || 'Furniture'
                    } : undefined
                }
            ]
        };

        try {
            const response = await fetch(
                `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.catalogId}/batch`,
                {
                    method: 'POST',
                    headers: whatsappGraphService.getHeaders(),
                    body: JSON.stringify(batchRequest)
                }
            );

            const data = await response.json();
            
            if (data.error) {
                console.error("[WhatsAppService] Erro no Batch Sync:", data.error);
                if (data.error.code === 200 || data.error.message?.includes("blocked")) {
                    throw new Error("Acesso à API Bloqueado: Verifique se o Token tem permissão 'catalog_management' e se o Catálogo ID está correto no Gerenciador de Negócios.");
                }
                throw new Error(data.error.message || "Erro desconhecido ao sincronizar.");
            }

            return data;
        } catch (error: any) {
            console.error("Erro fatal no sync WhatsApp:", error);
            throw error;
        }
    },

    /**
     * Removes a product from the Meta Catalog
     */
    deleteProductFromCatalog: async (retailerId: string) => {
        return whatsappGraphService.syncProductToCatalog({ code: retailerId }, 'DELETE');
    },

    /**
     * Lista as coleções (product sets) do catálogo na Meta
     */
    listProductSets: async (): Promise<{ id: string; name: string; filter: string }[]> => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.catalogId) throw new Error("Catalog ID não configurado.");

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${whatsappConfig.catalogId}/product_sets?fields=id,name,filter`,
            { headers: whatsappGraphService.getHeaders() }
        );
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "Erro ao listar coleções.");
        return data.data || [];
    },

    /**
     * Deleta uma coleção (product set) da Meta pelo ID
     */
    deleteProductSet: async (productSetId: string): Promise<boolean> => {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${productSetId}`,
            {
                method: 'DELETE',
                headers: whatsappGraphService.getHeaders()
            }
        );
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "Erro ao deletar coleção.");
        return data.success === true;
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
