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
        
        const isInactiveOrHidden = product.active === false || product.hidden === true || product.deleted === true;
        const targetAction = isInactiveOrHidden ? 'DELETE' : action;

        const cleanTitle = product.name || product.title || (product.description ? String(product.description).split('\n')[0] : 'Produto Morante');
        const cleanDescription = product.whatsappDescription || product.whatsapp_description || product.description || cleanTitle;

        // Processar e sanitizar imagens para a Meta
        let singleImageUrls: string[] = [];
        if (Array.isArray(product.images) && product.images.length > 0) {
            product.images.forEach((imgItem: any) => {
                if (imgItem) {
                    String(imgItem).split(',').forEach(url => {
                        const trimmed = url.trim();
                        if (trimmed && !singleImageUrls.includes(trimmed)) singleImageUrls.push(trimmed);
                    });
                }
            });
        } else if (product.image_url) {
            String(product.image_url).split(',').forEach(url => {
                const trimmed = url.trim();
                if (trimmed && !singleImageUrls.includes(trimmed)) singleImageUrls.push(trimmed);
            });
        }

        const fallbackUrl = 'https://moveismorante.com.br/logo.png';
        const SUPABASE_STORAGE_PATTERN = /https:\/\/.*?\.supabase\.co\/storage\/v1\/object\/public\/products\/(.*)/i;
        const R2_BASE_URL = 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev';

        const sanitizeUrl = (urlStr: string) => {
            if (!urlStr) return fallbackUrl;
            let str = String(urlStr).trim().split('?')[0];
            if (SUPABASE_STORAGE_PATTERN.test(str)) {
                const match = str.match(SUPABASE_STORAGE_PATTERN);
                if (match && match[1]) {
                    const fileName = match[1].split('/').pop();
                    str = `${R2_BASE_URL}/${fileName}`;
                }
            }
            if (!str.startsWith('http://') && !str.startsWith('https://')) str = `https://${str}`;
            return encodeURI(str);
        };

        const sanitizedSingleImages = singleImageUrls.map(sanitizeUrl).filter(Boolean);
        const mainImageUrl = sanitizedSingleImages.length > 0 ? sanitizedSingleImages[0] : fallbackUrl;
        const additionalImageUrls = sanitizedSingleImages.length > 1 ? sanitizedSingleImages.slice(1, 10) : [];

        const batchRequest = {
            requests: [
                {
                    method: targetAction,
                    retailer_id: String(product.code || product.sku || product.id),
                    data: targetAction === 'UPDATE' ? {
                        name: cleanTitle,
                        description: cleanDescription,
                        price: priceCents,
                        currency: 'BRL',
                        condition: product.condition === 'usado' ? 'used' : 'new',
                        availability: 'in stock',
                        image_url: mainImageUrl,
                        additional_image_urls: additionalImageUrls,
                        brand: product.brand || 'Móveis Morante',
                        url: `https://moveismorante.com.br/p/${product.id}`,
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
            
            if (!response.ok || data.error) {
                console.error("[WhatsAppService] Erro no Batch Sync:", data.error || data);
                const code = data.error?.code;
                const msg = data.error?.message || "";

                if (code === 190 || code === 100 || response.status === 401 || msg.includes("Application has been deleted") || msg.includes("invalid")) {
                    throw new Error("Token do Meta expirado ou inválido. Atualize o 'Token de Acesso' nas Configurações > WhatsApp API.");
                }
                if (data.error?.code === 200 || data.error?.message?.includes("blocked")) {
                    throw new Error("Acesso à API Bloqueado: Verifique se o Token tem permissão 'catalog_management' e se o Catálogo ID está correto no Gerenciador de Negócios.");
                }
                throw new Error(msg || "Erro desconhecido ao sincronizar.");
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
     * Sincroniza uma lista inteira de produtos em lotes via Batch Request da Meta Graph API
     */
    syncBatchProductsToCatalog: async (productsList: any[], onProgress?: (processed: number, total: number) => void) => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.catalogId) throw new Error("Catalog ID não configurado.");

        if (!productsList || productsList.length === 0) return { success: true, count: 0 };

        // A Meta limita batch a 50 itens por requisição
        const BATCH_SIZE = 50;
        let syncedCount = 0;
        const total = productsList.length;

        if (onProgress) onProgress(0, total);

        for (let i = 0; i < productsList.length; i += BATCH_SIZE) {
            const chunk = productsList.slice(i, i + BATCH_SIZE);
            const requests = chunk.map(product => {
                const isHidden = product.status === 'hidden' || product.hidden === true;
                const isDeleted = product.deleted === true || product.deleted_at !== undefined && product.deleted_at !== null;
                const isInactiveOrHidden = isHidden || isDeleted;
                const retailerId = String(product.code || product.sku || product.id);

                // Se estiver explicitamente oculto ou deletado na lixeira, remove do catálogo via DELETE
                if (isInactiveOrHidden) {
                    return {
                        method: 'DELETE',
                        retailer_id: retailerId
                    };
                }

                const cleanTitle = product.name || product.title || (product.description ? String(product.description).split('\n')[0] : 'Produto Morante');
                const baseProdDesc = product.whatsappDescription || product.whatsapp_description || product.description || cleanTitle;

                const globalPrefix = `🚚📦 Entrega rápida (1 a 5 dias úteis) para Curitiba e Região, consulte conosco a disponibilidade e o valor do frete

💳 Pagamento parcelado nas bandeiras VISA, MASTER, MASTERCARD, MAESTRO, HIPERCARD, ELO, em até 10x sem juros no cartão de crédito

🚨⚠️ Aceitamos Senff com juros.

✅ À vista tem desconto no pix, débito ou dinheiro!


✅ Sem taxa de frete para endereços próximos.


✅ Montagem Incluída para a retirada ou entrega.


✅ Atendimento Via WhatsApp

https://wa.me/5541997493547


🛒 VEJA MAIS DOS NOSSOS PRODUTOS CLICANDO NO LINK ABAIXO:

https://moveismorante.com.br

___________________________________

Móveis Morante

▶ CNPJ: 44.512 248/0001-07

🕒 Aberto: Seg a Sex ( 9h às 18h ) e Sab ( 9h às 17h )

🗺📍Rua Cascavel, 306, Guaraituba, Colombo - PR

____________________________________


👁🗨 ESPECIFICAÇÕES:`;

                const cleanDescription = `${globalPrefix}\n\n${baseProdDesc}`;
                const rawPrice = product.unitPrice ?? product.unit_price ?? product.price ?? product.sales_price ?? 0;
                const priceCents = Math.round(Number(rawPrice) * 100);

                // Processar todas as imagens do produto
                let allImageUrls: string[] = [];
                if (Array.isArray(product.images) && product.images.length > 0) {
                    product.images.forEach((imgItem: any) => {
                        if (imgItem) {
                            String(imgItem).split(',').forEach(url => {
                                const trimmed = url.trim();
                                if (trimmed && !allImageUrls.includes(trimmed)) {
                                    allImageUrls.push(trimmed);
                                }
                            });
                        }
                    });
                } else if (product.image_url) {
                    String(product.image_url).split(',').forEach(url => {
                        const trimmed = url.trim();
                        if (trimmed && !allImageUrls.includes(trimmed)) {
                            allImageUrls.push(trimmed);
                        }
                    });
                }

                const fallbackUrl = 'https://moveismorante.com.br/logo.png';
                const SUPABASE_STORAGE_PATTERN = /https:\/\/.*?\.supabase\.co\/storage\/v1\/object\/public\/products\/(.*)/i;
                const R2_BASE_URL = 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev';

                // Função helper para converter e sanitizar URLs exatamente como no Feed CSV
                const sanitizeUrl = (urlStr: string) => {
                    if (!urlStr) return fallbackUrl;
                    let str = String(urlStr).trim();
                    
                    // Se houver query params desnecessários, limpa para manter o link direto da imagem
                    str = str.split('?')[0];

                    // Se for uma imagem legada do Supabase Storage, mapeia dinamicamente para o R2 da Cloudflare
                    if (SUPABASE_STORAGE_PATTERN.test(str)) {
                        const match = str.match(SUPABASE_STORAGE_PATTERN);
                        if (match && match[1]) {
                            const fileName = match[1].split('/').pop();
                            str = `${R2_BASE_URL}/${fileName}`;
                        }
                    }

                    if (!str.startsWith('http://') && !str.startsWith('https://')) {
                        str = `https://${str}`;
                    }
                    return encodeURI(str);
                };

                const sanitizedImages = allImageUrls.map(sanitizeUrl).filter(Boolean);
                const mainImageUrl = sanitizedImages.length > 0 ? sanitizedImages[0] : fallbackUrl;
                const additionalImageUrls = sanitizedImages.length > 1 ? sanitizedImages.slice(1, 10) : []; // Meta suporta até 10 imagens adicionais

                return {
                    method: 'UPDATE',
                    retailer_id: retailerId,
                    data: {
                        name: cleanTitle,
                        description: cleanDescription,
                        price: priceCents,
                        currency: 'BRL',
                        condition: product.condition === 'usado' ? 'used' : 'new',
                        availability: 'in stock',
                        image_url: mainImageUrl,
                        additional_image_urls: additionalImageUrls,
                        brand: product.brand || 'Móveis Morante',
                        url: `https://moveismorante.com.br/p/${product.id}`,
                        category: product.groupName || product.group_name || 'Furniture'
                    }
                };
            });

            const response = await fetch(
                `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.catalogId}/batch`,
                {
                    method: 'POST',
                    headers: whatsappGraphService.getHeaders(),
                    body: JSON.stringify({ requests })
                }
            );

            const data = await response.json();
            if (!response.ok || data.error) {
                console.error("[WhatsAppService] Erro no Lote Meta API:", data.error || data);
                const code = data.error?.code;
                const msg = data.error?.message || "";

                if (code === 190 || code === 100 || response.status === 401 || msg.includes("Application has been deleted") || msg.includes("invalid")) {
                    throw new Error("Token do Meta expirado ou inválido (App excluído/desativado). Atualize o 'Token de Acesso' nas Configurações > WhatsApp API.");
                }
                throw new Error(msg || "Erro no envio em lote da Meta API.");
            }
            syncedCount += chunk.length;
            if (onProgress) onProgress(syncedCount, total);
        }

        return { success: true, count: syncedCount };
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
    },

    /**
     * Sends an interactive message with quick reply button via Cloud API
     */
    sendInteractiveButtonMessage: async (to: string, text: string, buttonTitle: string = 'Confirmar Entrega', buttonId: string = 'confirm_delivery') => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.phoneNumberId) throw new Error("Phone Number ID não configurado.");

        const cleanPhone = to.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        try {
            const response = await fetch(
                `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.phoneNumberId}/messages`,
                {
                    method: 'POST',
                    headers: whatsappGraphService.getHeaders(),
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: formattedPhone,
                        type: 'interactive',
                        interactive: {
                            type: 'button',
                            body: { text },
                            action: {
                                buttons: [
                                    {
                                        type: 'reply',
                                        reply: { id: buttonId, title: buttonTitle }
                                    }
                                ]
                            }
                        }
                    })
                }
            );

            const data = await response.json();
            if (data.error) {
                console.warn("Erro ao enviar mensagem interativa WhatsApp, tentando fallback de texto simples:", data.error);
                return await whatsappGraphService.sendTextMessage(to, `${text}\n\n*Responda "${buttonTitle.toUpperCase()}" para confirmar.*`);
            }
            return data;
        } catch (err) {
            return await whatsappGraphService.sendTextMessage(to, `${text}\n\n*Responda "${buttonTitle.toUpperCase()}" para confirmar.*`);
        }
    },

    /**
     * Lista todos os modelos de mensagem aprovados no WhatsApp Business Account (WABA)
     */
    fetchMessageTemplates: async (): Promise<any[]> => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.wabaId) throw new Error("WABA ID (WhatsApp Business Account ID) não configurado.");
        if (!whatsappConfig?.accessToken) throw new Error("Token de Acesso não configurado.");

        const response = await fetch(
            `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.wabaId}/message_templates?fields=name,status,language,category,components`,
            { headers: whatsappGraphService.getHeaders() }
        );

        const data = await response.json();
        if (data.error) {
            console.error("Erro ao listar modelos de mensagem do WhatsApp:", data.error);
            throw new Error(`Meta API: ${data.error.message} (Código ${data.error.code})`);
        }
        return data.data || [];
    },

    /**
     * Sends an approved message template via Meta Cloud API
     */
    sendTemplateMessage: async (to: string, templateName: string, parameters: string[] = [], languageCode?: string) => {
        const { whatsappConfig } = getSettings();
        if (!whatsappConfig?.phoneNumberId) throw new Error("Phone Number ID não configurado nas Configurações > WhatsApp API.");

        const cleanPhone = to.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
        const targetLanguage = languageCode || whatsappConfig?.templateLanguage || 'pt_BR';

        const components: any[] = [];
        if (parameters && parameters.length > 0) {
            const bodyParams = parameters.map(p => ({ type: 'text', text: String(p ?? ' ') }));
            components.push({
                type: 'body',
                parameters: bodyParams
            });
        }

        const payload: any = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'template',
            template: {
                name: templateName.trim(),
                language: { code: targetLanguage },
                ...(components.length > 0 ? { components } : {})
            }
        };

        console.log("[WhatsApp API] Enviando Template Payload:", JSON.stringify(payload, null, 2));

        let response = await fetch(
            `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: whatsappGraphService.getHeaders(),
                body: JSON.stringify(payload)
            }
        );

        let data = await response.json();

        // Se falhar e for número brasileiro com 9 dígitos (ex: 554199...), tenta sem o 9º dígito (ex: 55419...)
        if (data.error && data.error.code === 100 && formattedPhone.length === 13 && formattedPhone.startsWith('55')) {
            const phoneWithoutNine = `55${formattedPhone.substring(2, 4)}${formattedPhone.substring(5)}`;
            console.log(`[WhatsApp API] Tentando formato sem 9º dígito: ${phoneWithoutNine}`);
            const altPayload = { ...payload, to: phoneWithoutNine };
            const altResponse = await fetch(
                `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.phoneNumberId}/messages`,
                {
                    method: 'POST',
                    headers: whatsappGraphService.getHeaders(),
                    body: JSON.stringify(altPayload)
                }
            );
            const altData = await altResponse.json();
            if (!altData.error) {
                return altData;
            }
        }

        // Se ainda falhar com erro de parâmetro de template, tenta alternar entre pt_BR e pt
        if (data.error && data.error.code === 100) {
            const altLang = targetLanguage === 'pt_BR' ? 'pt' : 'pt_BR';
            console.log(`[WhatsApp API] Tentando com idioma alternativo: ${altLang}`);
            const altPayloadLang = {
                ...payload,
                template: {
                    ...payload.template,
                    language: { code: altLang }
                }
            };
            const altResponseLang = await fetch(
                `${FACEBOOK_GRAPH_URL}/${GRAPH_API_VERSION}/${whatsappConfig.phoneNumberId}/messages`,
                {
                    method: 'POST',
                    headers: whatsappGraphService.getHeaders(),
                    body: JSON.stringify(altPayloadLang)
                }
            );
            const altDataLang = await altResponseLang.json();
            if (!altDataLang.error) {
                return altDataLang;
            }
        }

        if (data.error) {
            console.error("[WhatsApp API] Erro retornado pela Meta:", JSON.stringify(data.error, null, 2));
            const details = data.error.error_data?.details || '';
            const userTitle = data.error.error_user_title ? ` (${data.error.error_user_title})` : '';
            const userMsg = data.error.error_user_msg ? ` - ${data.error.error_user_msg}` : '';
            const baseMsg = data.error.message || "Parâmetro inválido na Meta API";
            const fullMsg = details ? `${baseMsg}: ${details}` : `${baseMsg}${userTitle}${userMsg}`;
            throw new Error(`Meta API (Código ${data.error.code}): ${fullMsg}`);
        }
        return data;
    }
};
