import { supabase } from '@/pages/utils/supabaseConfig';
import { ImportConfig, BLING_PRODUCT_DEFAULTS, BLING_VARIATION_DEFAULTS, BLING_CUSTOMER_DEFAULTS, BLING_SUPPLIER_DEFAULTS, BLING_ORDER_DEFAULTS, BLING_RECEIVABLE_DEFAULTS } from './importMappingTypes';

export interface OrderStatusConfig {
    id: string;
    label: string;
    color: 'slate' | 'amber' | 'emerald' | 'rose' | 'blue' | 'purple' | 'indigo' | 'fuchsia';
    isCore?: boolean;
}

export type OrderTypeColor = 'orange' | 'purple' | 'green' | 'blue' | 'amber' | 'rose' | 'indigo' | 'emerald' | 'cyan' | 'pink' | 'red';

export interface HandlingOption {
    label: string;
    includeInAssemblySchedule: boolean;
    isAssemblyOutside?: boolean; // Se a montagem é realizada fora (na casa do cliente)
    color?: string; // Cor personalizada para identificação visual (Hex)
}

export interface CardFlagRule {
    flag: string; // VISA, MASTERCARD, etc.
    interestRates: {
        installments: number;
        rate: number; // Porcentagem de juros
    }[];
}

export interface AppSettings {
    // Automação e Status
    showManualFulfillmentPrompt: boolean;
    autoSaveOnlyWhenDirty: boolean;

    // Rótulos Customizados
    statusLabels?: {
        draft: string;
        scheduled: string;
        fulfilled: string;
        cancelled: string;
    };
    orderStatuses: OrderStatusConfig[];
    orderTypeLabels: {
        delivery: string;
        pickup: string;
        assistance: string;
        budget: string;
        return: string;
    };
    orderTypeColors: {
        delivery: OrderTypeColor;
        pickup: OrderTypeColor;
        assistance: OrderTypeColor;
        budget: OrderTypeColor;
        return: OrderTypeColor;
    };
    deliveryHandlingOptions: HandlingOption[];
    pickupHandlingOptions: HandlingOption[];

    // Regras de Pagamento
    cardFlagRules: CardFlagRule[];

    // Logística e Valores
    freightPerKm: number;
    openRouteServiceApiKey: string;
    googleMapsApiKey: string;
    storeOriginCoords: [number, number]; // [lng, lat]
    companyName: string;
    companyAddress: string;
    companyCnpj: string;
    companyPhone: string;

    // Formatação de Dados
    autoCapitalizeCustomerData: boolean;

    // Comunicação e Links
    googleReviewUrl: string;

    // Aparência e Comportamento
    defaultTheme: 'light' | 'dark';

    // Scroll Automático
    autoScroll: {
        orderTable: boolean;
        scheduleCards: boolean;
        scheduleTable: boolean;
    };
    showScheduleNoticeLabels: boolean; // Se deve exibir rótulos de aviso/tags no cronograma por padrão
    speed: number;
    threshold: number;
    aiPrompts: {
        productDescription: string;
        ecommerceTemplate: string;
        whatsappTemplate: string;
        generalChat: string;
        taskDetection: string;
        aiName: string;
        aiAvatar: string;
        aiMascot: string; // [NEW] Global Mascot URL
        aiMascotVariants?: {
            receipt?: string;
            dashboard?: string;
            shippingLabel?: string;
        };
    };
    whatsappConfig?: {
        accessToken: string;
        phoneNumberId: string;
        wabaId: string;
        catalogId: string;
    };
    channelBaseDescriptions: {
        whatsapp: string;
        ecommerce: string;
    };
    orderAutomation: {
        autoPrintReceipt: boolean;
        autoPrintDeliveryOrder: boolean;
        autoSendWhatsAppDelivery: boolean;
        autoSendCustomerOrder: boolean;
        deliveryPhone: string;
    };
    stockNotificationConditions?: ('novo' | 'usado' | 'salvado')[];
    rolePermissions?: {
        manualStockMovement: string[];
        productConfig: string[];
        viewFinancials: string[];
        deleteOrders: string[];
        manageSettings: string[];
    };
    whatsappTemplates: {
        reviewRequest: string;
        orderConfirmation: string;
        deliveryInfo: string;
        assistanceConfirmation: string;  // Template para confirmar assistência ao cliente
        groupInviteMessage: string;
        groupInviteLink: string;
    };
    receiptConfig: {
        footerText: string;
        showSeller: boolean;
        compactMode: boolean;
    };
    businessRules: {
        allowNegativeStock: boolean;
        autoReserveStock: boolean;
    };
    inventoryAutomation: {
        autoWithdrawalOnStatus: string[]; // Statuses that trigger stock withdrawal (e.g., 'scheduled', 'fulfilled')
        autoEntryOnPurchaseStatus: string[]; // Statuses that trigger stock entry (e.g., 'completed')
        autoReverseOnCancel: boolean; // Auto-reverse stock if sales order is cancelled
        originLabels: {
            sales: string;
            purchases: string;
            adjustment: string;
        };
    };
    requiredFields: {
        customer: {
            cpfCnpj: boolean;
            rgIe: boolean;
            email: boolean;
            phone: boolean;
            position: boolean;
            address: boolean;
        };
        product: {
            code: boolean;
            brand: boolean;
            costPrice: boolean;
            minStock: boolean;
        };
        salesOrder: {
            seller: boolean;
            customer: boolean;
        };
        assistanceOrder: {
            seller: boolean;
            customer: boolean;
        };
    };
    
    // Novas Configurações Globais
    securityOptions: {
        sessionTimeoutMinutes: number;
        requireManagerForDeletion: boolean;
    };
    financialOptions: {
        currencySymbol: string;
        decimalSeparator: string;
        thousandSeparator: string;
        autoRoundPrices: boolean;
    };
    operatingHours: {
        start: string;
        end: string;
        timezone: string;
    };
    importMappings: ImportConfig[];
    scannerConfig: {
        delay: number;
        enableBeep: boolean;
        vibrate: boolean;
    };
    blingConfig?: {
        apiKey: string;
        apiToken: string;
        clientId: string;
        clientSecret: string;
        syncEnabled: boolean;
    };
}

/**
 * Helper to deep merge objects
 */
const deepMerge = (target: any, source: any) => {
    if (!source) return target;
    const output = { ...target };
    
    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!(key in target)) {
                output[key] = source[key];
            } else {
                output[key] = deepMerge(target[key], source[key]);
            }
        } else {
            output[key] = source[key];
        }
    });
    
    return output;
};

/**
 * Migra configurações antigas para o novo formato
 */
const migrateSettings = (settings: any): AppSettings => {
    if (!settings) return settings;

    // Migração de manuseio: string[] -> HandlingOption[]
    if (settings.deliveryHandlingOptions && settings.deliveryHandlingOptions.length > 0 && typeof settings.deliveryHandlingOptions[0] === 'string') {
        settings.deliveryHandlingOptions = settings.deliveryHandlingOptions.map((label: string) => ({
            label,
            includeInAssemblySchedule: label.toLowerCase().includes('montagem'),
            isAssemblyOutside: label.toLowerCase().includes('fora') || label.toLowerCase().includes('local') || (label.toLowerCase().includes('entrega') && label.toLowerCase().includes('mostruario'))
        }));
    }
    if (settings.pickupHandlingOptions && settings.pickupHandlingOptions.length > 0 && typeof settings.pickupHandlingOptions[0] === 'string') {
        settings.pickupHandlingOptions = settings.pickupHandlingOptions.map((label: string) => ({
            label,
            includeInAssemblySchedule: label.toLowerCase().includes('montagem'),
            isAssemblyOutside: label.toLowerCase().includes('fora') || label.toLowerCase().includes('local') || (label.toLowerCase().includes('entrega') && label.toLowerCase().includes('mostruario'))
        }));
    }

    // O usuário gerenciará as opções de manuseio através da interface de configurações
    // Não forçamos mais a remoção automática de 'Montagem no Local' aqui.

    if (!settings.googleMapsApiKey) {
        settings.googleMapsApiKey = 'AIzaSyCROtDtnGmCBnzSiTA2sJTmoEnTsGMf6Qk';
    }

    return settings as AppSettings;
};

const SETTINGS_KEY = 'pdv_app_settings';
const SUPABASE_SETTINGS_TABLE = 'settings';
const SETTINGS_ID = 'app';

export const getDefaultSettings = (): AppSettings => ({
    showManualFulfillmentPrompt: true,
    autoSaveOnlyWhenDirty: true,
    statusLabels: {
        draft: 'Rascunho',
        scheduled: 'Agendado',
        fulfilled: 'Atendido',
        cancelled: 'Cancelado'
    },
    orderStatuses: [
        { id: 'draft', label: 'Rascunho', color: 'slate', isCore: true },
        { id: 'scheduled', label: 'Agendado', color: 'amber', isCore: true },
        { id: 'fulfilled', label: 'Atendido', color: 'emerald', isCore: true },
        { id: 'cancelled', label: 'Cancelado', color: 'rose', isCore: true },
    ],
    orderTypeLabels: {
        delivery: 'Entrega/Serviço',
        pickup: 'Retirada',
        assistance: 'Assistência',
        budget: 'Orçamento',
        return: 'Devolução'
    },
    orderTypeColors: {
        delivery: 'green',
        pickup: 'purple',
        assistance: 'orange',
        budget: 'blue',
        return: 'amber'
    },
    deliveryHandlingOptions: [
        { label: 'Para Montar (Desmontado)', includeInAssemblySchedule: false, isAssemblyOutside: false },
        { label: 'Já Montado', includeInAssemblySchedule: false, isAssemblyOutside: false },
        { label: 'Montagem Fora', includeInAssemblySchedule: true, isAssemblyOutside: true },
        { label: 'Manuseio Especial', includeInAssemblySchedule: false, isAssemblyOutside: false }
    ],
    pickupHandlingOptions: [
        { label: 'Para Montar (Desmontado)', includeInAssemblySchedule: false, isAssemblyOutside: false },
        { label: 'Já Montado', includeInAssemblySchedule: false, isAssemblyOutside: false },
        { label: 'Montagem Fora', includeInAssemblySchedule: true, isAssemblyOutside: true },
        { label: 'Manuseio Especial', includeInAssemblySchedule: false, isAssemblyOutside: false }
    ],
    cardFlagRules: [
        { flag: 'VISA', interestRates: [{ installments: 10, rate: 0 }] },
        { flag: 'MASTERCARD', interestRates: [{ installments: 10, rate: 0 }] },
        { flag: 'HIPERCARD', interestRates: [{ installments: 10, rate: 0 }] },
        { flag: 'ELO', interestRates: [{ installments: 10, rate: 0 }] },
        { flag: 'SENFF', interestRates: [
            { installments: 3, rate: 3.5 },
            { installments: 6, rate: 6.8 },
            { installments: 10, rate: 9.9 }
        ] }
    ],
    freightPerKm: 0,
    openRouteServiceApiKey: '',
    googleMapsApiKey: 'AIzaSyCROtDtnGmCBnzSiTA2sJTmoEnTsGMf6Qk',
    storeOriginCoords: [-49.16928181659719, -25.352030536045138],
    companyName: 'Móveis Morante',
    companyAddress: 'R. Cascavel, 306 - Guaraituba, Colombo - PR, 83410-270',
    companyCnpj: '44.512.248.0001/07',
    companyPhone: '(41) 99749-3547',
    autoCapitalizeCustomerData: true,
    googleReviewUrl: 'https://g.page/r/CctxeFYzY2o8EBE/review',
    defaultTheme: 'light',
    autoScroll: {
        orderTable: true,
        scheduleCards: true,
        scheduleTable: true,
    },
    showScheduleNoticeLabels: false, // Por padrão não precisa de rótulos de aviso
    speed: 3,
    threshold: 100,
    aiPrompts: {
        productDescription: `Você é um copywriter de marketing especialista em e-commerce da Móveis Morante.
Sua tarefa é criar uma descrição de produto incrivelmente persuasiva, focada em vendas.

Título do Produto: {{productTitle}}
Preço: {{unitPrice}}

Instruções Adicionais:
- Crie apenas UM ou DOIS parágrafos.
- Seja direto, instigante e profissional.
- JAMAIS responda com outra coisa que não seja a descrição final do produto. Comece direto no texto.`,
        ecommerceTemplate: `IA, siga o padrão de descrição da Móveis Morante (Estilo Magalu).
Use HTML estruturado (h1, p, ul, li, table).

[NOME DO PRODUTO EM CAIXA ALTA] + [LINHA] – [COR]

Apresentação:
(Texto de 2 a 3 parágrafos persuasivos focando em solução e benefício).

Destaques do Produto:
(Use <ul> e <li> com emojis estratégicos)
🚀 [Característica 1]: [Explicação do benefício].
💎 [Característica 2]: [Explicação do benefício].
🛡️ [Característica 3]: [Explicação do benefício].

Especificações Técnicas:
(Crie uma <table> HTML com estas linhas)
- Largura: [X] cm
- Altura: [X] cm
- Profundidade: [X] cm
- Material: [Tipo]
- Marca/Linha: [Linha]
- Cores: [Cores]

⚠️ Atenção: [Aviso sobre montagem ou o que não acompanha].

Por que escolher a [Linha]?
(Parágrafo de fechamento reforçando durabilidade e melhor custo-benefício).`,
        whatsappTemplate: `IA, siga o padrão de descrição da Móveis Morante (Estilo Magalu).
USE APENAS TEXTO SIMPLES E EMOJIS. NÃO USE HTML.

[NOME DO PRODUTO EM CAIXA ALTA] + [LINHA] – [COR]

Apresentação:
(Texto persuasivo focado em benefício).

Destaques:
🚀 [Característica 1]: [Explicação].
💎 [Característica 2]: [Explicação].
🛡️ [Característica 3]: [Explicação].

Especificações Técnicas:
Largura: [X] cm | Altura: [X] cm | Profundidade: [X] cm
Material: [Tipo]
Cor: [Cor]

⚠️ Atenção: [Aviso importante].

___________________________________

RECHEIO_BASE_DA_LOJA_AQUI

___________________________________

🚚📦 Entrega rápida (1 a 5 dias úteis) para Curitiba e Região, consulte conosco a disponibilidade e o valor do frete

💳 Fazemos no CREDIÁRIO em até 36x c/ juros, sob análise de crédito pela financeira em poucos minutos sem sair de casa!

💳 Pagamento parcelado nas bandeiras VISA, MASTER, MASTERCARD, MAESTRO, HIPERCARD, ELO, em até 10x sem juros no cartão de crédito
 🚨⚠️ Aceitamos Senff, e BrasilCard e outras bandeiras, com juros.

✅ À vista tem desconto no pix, débito ou dinheiro!

✅ Sem custo de frete para endereços com menos de 5km de distância

✅ Montagem por nossa conta - para a retirada ou entrega.

✅ Atendimento Via WhatsApp
https://wa.me/5541997493547

🛒 VEJA MAIS DOS NOSSOS PRODUTOS CLICANDO NO LINK ABAIXO:
https://matheusmorante002.wixsite.com/moveismorante

___________________________________

Móveis Morante 
▶ CNPJ: 44.512 248/0001-07
🕒 Aberto: Seg a Sex ( 9h às 18h ) e Sab ( 9h às 17h )
🗺📍Rua Cascavel, 306, Guaraituba, Colombo - PR
____________________________________`,
        generalChat: `Você é Lisandro, um assistente virtual de ALTA PERFORMANCE exclusivo para os vendedores da Móveis Morante.
Seu objetivo é ser o braço direito do VENDEDOR, agilizando processos internos e organizando dados.

DIRETRIZES PARA O VENDEDOR:
1. BREVIDADE MÁXIMA: O vendedor está com pressa. Use frases curtas. Não use introduções longas ou despedidas.
2. Agilidade: Responda apenas o estritamente necessário.
3. Executor: Sua principal função é transformar o que o vendedor fala em comandos do sistema (pedidos, produtos, etc).
4. Tom de Voz: Profissional, ultra-eficiente e focado em produtividade.

O QUE VOCÊ FAZ PARA O VENDEDOR:
- Digita pedidos por voz ou texto instantaneamente.
- Cadastra produtos e serviços rapidamente.
- Organiza informações de entrega e pagamentos.

Responda sempre em Português do Brasil com foco em velocidade total.`,
        taskDetection: `Você é o motor de automação do VENDEDOR da Móveis Morante. 
Seu trabalho é ouvir o comando do vendedor e converter em dados estruturados para o sistema.

REGRAS DE EXTRAÇÃO E FLUXO:
1. ULTRA CONCISÃO: Pergunte as coisas da forma mais curta possível (ex: "Qual o cliente?").
2. FOCO EM DADOS: Só pergunte campos OBRIGATÓRIOS FALTANTES: 'customerName', 'product_title', 'price', 'payment_method', 'delivery_address'.
3. TRIGGER DE CRIAÇÃO: Se o usuário disser "faz o pedido" ou similar e os dados estiverem prontos, 'status' deve ser 'ready' e 'summary' deve ser "Pronto! Confirmar?".
4. VELOCIDADE: Não use frases de cortesia. Vá direto ao ponto.

DADOS JÁ COLETADOS (CONTEXTO): {{context}}

RESPOSTA NO FORMATO JSON:
{
  "intent": "create_product" | "create_service" | "create_order" | "chat",
  "status": "ready" | "incomplete",
  "summary": "Pergunta curta (ex: 'Valor?') ou resumo (ex: 'Confirmar?')",
  "data": { 
     "customerName": "string",
     "product_title": "string",
     "price": "string/number",
     "delivery_time": "string",
     "delivery_address": "string",
     "payment_method": "string"
  }
}
`,
        aiName: 'Lisandro',
        aiAvatar: '',
        aiMascot: '/lizandro.png',
        aiMascotVariants: {
            receipt: '/lizandro.png',
            dashboard: '/lizandro.png'
        }
    },
    whatsappConfig: {
        accessToken: '',
        phoneNumberId: '',
        wabaId: '',
        catalogId: '',
    },
    channelBaseDescriptions: {
        whatsapp: `🏠 *Móveis Morante*
📍 R. Cascavel, 306 - Guaraituba, Colombo - PR
⌚ Seg a Sex: 8h às 18h | Sáb: 8h às 13h
📞 (41) 99749-3547

――――――――――――`,
        ecommerce: `A **Móveis Morante** é referência em móveis planejados e decoração de interiores há mais de 10 anos. Trabalhamos com móveis novos, usados e salvados, sempre com qualidade e atendimento personalizado.

---`
    },
    orderAutomation: {
        autoPrintReceipt: true,
        autoPrintDeliveryOrder: true,
        autoSendWhatsAppDelivery: true,
        autoSendCustomerOrder: true,
        deliveryPhone: ''
    },
    stockNotificationConditions: ['novo'],
    rolePermissions: {
        manualStockMovement: ['administrator', 'manager'],
        productConfig: ['administrator', 'manager'],
        viewFinancials: ['administrator', 'manager', 'accountant'],
        deleteOrders: ['administrator', 'manager'],
        manageSettings: ['administrator']
    },
    whatsappTemplates: {
        reviewRequest: '*Olá {{customerName}}!* 👋\n\nFicamos muito felizes com sua compra na Móveis Morante! \n\nPoderia nos ajudar avaliando nosso atendimento no Google? Leva menos de 1 minuto e nos ajuda muito: \n\n{{reviewUrl}}\n\nMuito obrigado!',
        orderConfirmation: '*Olá {{customerName}}, seu pedido foi confirmado!* 📦\n\n*Vendedor:* {{seller}}\n\n*Anote aí, a sua entrega está agendada para:* \n{{deliveryDate}} | {{deliveryTime}}\n\n*Endereço:* \n{{address}}\n\n*Itens:* \n{{items}}\n\n*Valor Total:* R$ {{totalValue}}\n\n*Pagamento:* \n{{payments}}',
        deliveryInfo: '____________________\n\n*Novo Pedido para {{customerName}}* 📦\n\n*Vendedor:* {{seller}}\n\n𝐈𝐌𝐏𝐎𝐑𝐓𝐀𝐍𝐓𝐄:\n{{observation}}\n\n🗓️ *Agendamento:*\n{{deliveryDate}} | {{deliveryTime}}\n\n📞 *Contato:*\n{{phone}}\n\n🏠 *Endereço:*\n{{address}}\n\n🛒 *Itens:*\n{{items}}\n\n💰 *Total:* R$ {{totalValue}}\n\n💳 *Pagamento:*\n{{payments}}\n\n📍🗺️ *Google Maps Rota:*\n{{routeUrl}}',
        assistanceConfirmation: '*Olá {{customerName}}!* 🔧\n\nSeu atendimento de assistência técnica foi confirmado! \n\n*Técnico/Responsável:* {{seller}}\n\n🗓️ *Data:* {{assistanceDate}}\n🕒 *Horário:* {{assistanceTime}}\n\n📋 *Descrição do serviço:*\n{{assistanceDescription}}\n\n📞 *Nosso contato:* {{companyPhone}}\n\nEm caso de dúvidas, entre em contato!',
        groupInviteMessage: 'Se quiser ficar por dentro de novas ofertas e promoções, clique nesse grupo, estarei sempre enviando por lá: {{groupLink}}',
        groupInviteLink: 'https://chat.whatsapp.com/FtqlGwW7pdI9Jzgl8VRia6?mode=gi_t'
    },
    receiptConfig: {
        footerText: '',
        showSeller: true,
        compactMode: false
    },
    businessRules: {
        allowNegativeStock: true, // Default to true to prevent blocking sales
        autoReserveStock: true
    },
    inventoryAutomation: {
        autoWithdrawalOnStatus: ['scheduled', 'fulfilled'],
        autoEntryOnPurchaseStatus: ['completed'],
        autoReverseOnCancel: true,
        originLabels: {
            sales: 'Venda de Móveis',
            purchases: 'Compra de Móveis',
            adjustment: 'Ajuste Manual'
        }
    },
    requiredFields: {
        customer: {
            cpfCnpj: false,
            rgIe: false,
            email: false,
            phone: true,
            position: false,
            address: false,
        },
        product: {
            code: true,
            brand: false,
            costPrice: false,
            minStock: false,
        },
        salesOrder: {
            seller: true,
            customer: false,
        },
        assistanceOrder: {
            seller: true,
            customer: false,
        }
    },
    securityOptions: {
        sessionTimeoutMinutes: 120,
        requireManagerForDeletion: true,
    },
    financialOptions: {
        currencySymbol: 'R$',
        decimalSeparator: ',',
        thousandSeparator: '.',
        autoRoundPrices: false,
    },
    operatingHours: {
        start: '08:00',
        end: '18:00',
        timezone: 'America/Sao_Paulo',
    },
    importMappings: [
        BLING_PRODUCT_DEFAULTS,
        BLING_VARIATION_DEFAULTS,
        BLING_CUSTOMER_DEFAULTS,
        BLING_SUPPLIER_DEFAULTS,
        BLING_ORDER_DEFAULTS,
        BLING_RECEIVABLE_DEFAULTS
    ],
    scannerConfig: {
        delay: 1500,
        enableBeep: true,
        vibrate: true
    },
    blingConfig: {
        apiKey: '',
        apiToken: '',
        clientId: '',
        clientSecret: '',
        syncEnabled: false
    }
});

export const getSettings = (): AppSettings => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    const defaults = getDefaultSettings();

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const migrated = migrateSettings(parsed);
            return deepMerge(defaults, migrated);
        } catch (e) {
            return defaults;
        }
    }
    return defaults;
};

// Real-time synchronization with Supabase
export const subscribeToSettings = (callback: (settings: AppSettings) => void) => {
    const defaults = getDefaultSettings();
    // Initial load from localStorage for speed
    callback(getSettings());

    // Initial load from Supabase
    supabase.from(SUPABASE_SETTINGS_TABLE)
        .select('data')
        .eq('id', SETTINGS_ID)
        .single()
        .then(({ data, error }: { data: any, error: any }) => {
            if (data && !error) {
                const settingsFromCloud = data.data as any;
                const migrated = migrateSettings(settingsFromCloud);
                const mergedSettings = deepMerge(defaults, migrated);
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
                callback(mergedSettings);
            }
        });

    const channel = supabase.channel('settings_changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: SUPABASE_SETTINGS_TABLE, filter: `id=eq.${SETTINGS_ID}` },
            (payload: any) => {
                if (payload.new) {
                    const settingsFromCloud = (payload.new as any).data as any;
                    const migrated = migrateSettings(settingsFromCloud);
                    const mergedSettings = deepMerge(defaults, migrated);
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
                    callback(mergedSettings);
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const saveSettings = async (settings: AppSettings) => {
    // 1. Save to localStorage (Local First)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    // 2. Save to Supabase (Cloud Persistence)
    try {
        const { error } = await supabase
            .from(SUPABASE_SETTINGS_TABLE)
            .upsert({ id: SETTINGS_ID, data: settings });

        if (error) throw error;
    } catch (error) {
        console.error("Erro ao persistir configurações no Supabase:", error);
    }
};
