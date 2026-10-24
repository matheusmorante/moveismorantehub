import { AppSettings } from './types';
import {
  MORANTE_DELIVERY_HANDLING_OPTIONS,
  MORANTE_PICKUP_HANDLING_OPTIONS,
} from '../handlingMigration';
import { PERMISSION_ACTIONS } from '../permissionConfig';

export const SETTINGS_KEY = 'pdv_app_settings';
export const SUPABASE_SETTINGS_TABLE = 'settings';
export const SETTINGS_ID = 'app';

export const getDefaultSettings = (): AppSettings => ({
  showManualFulfillmentPrompt: true,
  autoSaveOnlyWhenDirty: true,
  statusLabels: {
    draft: 'Rascunho',
    scheduled: 'Agendado',
    fulfilled: 'Atendido',
    cancelled: 'Cancelado',
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
    return: 'Devolução',
  },
  orderTypeColors: {
    delivery: 'green',
    pickup: 'purple',
    assistance: 'amber',
    budget: 'blue',
    return: 'orange',
  },
  deliveryHandlingOptions: MORANTE_DELIVERY_HANDLING_OPTIONS,
  pickupHandlingOptions: MORANTE_PICKUP_HANDLING_OPTIONS,
  cardFlagRules: [
    { flag: 'VISA', interestRates: [{ installments: 10, rate: 0 }] },
    { flag: 'MASTERCARD', interestRates: [{ installments: 10, rate: 0 }] },
    { flag: 'HIPERCARD', interestRates: [{ installments: 10, rate: 0 }] },
    { flag: 'ELO', interestRates: [{ installments: 10, rate: 0 }] },
    {
      flag: 'SENFF',
      interestRates: [
        { installments: 3, rate: 3.5 },
        { installments: 6, rate: 6.8 },
        { installments: 10, rate: 9.9 },
      ],
    },
  ],
  freightPerKm: 2,
  storeOriginCoords: [-49.16948, -25.35205],
  companyName: 'Móveis Morante',
  companyDanfeLogoUrl: '/images/logo-morante.svg',
  companyAddress: 'R. Cascavel, 306 - Guaraituba, Colombo - PR, 83410-270',
  companyCnpj: '44.512.248.0001/07',
  companyPhone: '(41) 99749-3547',
  companyIE: '9091234567',
  companyIM: '',
  companyCRT: '1',
  companyLogradouro: 'R. Cascavel',
  companyNumero: '306',
  companyBairro: 'Guaraituba',
  companyCEP: '83410-270',
  companyCMun: '4105805', // Colombo - PR
  companyXMun: 'Colombo',
  companyUF: 'PR',
  nfeEnvironment: 2, // 2 = Homologação / Testes
  nfeSerie: '1',
  nfeNextNumber: 102,
  nfceNextNumber: 600,
  nfeHomologationSerie: '900',
  nfeHomologationNextNumber: 102,
  nfceHomologationNextNumber: 600,
  cscId: '',
  autoInboundScienceEnabled: false,
  fiscalDefaults: {
    ncm: '94036000',
    cest: '',
    cfop: '5102',
    returnCfop: '1202',
    inverseCfopMappings: {},
    cst: '103',
    icmsPercent: 0,
    origem: '0',
    pisCst: '99',
    cofinsCst: '99',
  },
  autoCapitalizeCustomerData: true,
  googleReviewUrl: 'https://g.page/r/CctxeFYzY2o8EBE/review',
  defaultTheme: 'light',
  autoScroll: {
    orderTable: false,
    scheduleCards: false,
    scheduleTable: false,
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
    generalChat: `Você é Seu Lizandro, um assistente virtual de ALTA PERFORMANCE exclusivo para os vendedores da Móveis Morante.
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
    aiName: 'Seu Lizandro',
    aiAvatar: '',
    aiMascot: '/lizandro.png',
    aiMascotVariants: {
      receipt: '/lizandro.png',
      dashboard: '/lizandro.png',
    },
  },
  whatsappConfig: {
    phoneNumberId: '',
    wabaId: '',
    catalogId: '',
    sendMode: 'wame',
    templateNameOrderConfirmation: 'envio_de_pedido',
    templateLanguage: 'pt_BR',
    templateVariableCount: 8,
  },
  channelBaseDescriptions: {
    whatsapp: `🏠 *Móveis Morante*
📍 R. Cascavel, 306 - Guaraituba, Colombo - PR
⌚ Seg a Sex: 9h às 18h | Sáb: 9h às 17h
📞 (41) 99749-3547

――――――――――――`,
    ecommerce: `A **Móveis Morante** é referência em móveis planejados e decoração de interiores há mais de 10 anos. Trabalhamos com móveis novos, usados e salvados, sempre com qualidade e atendimento personalizado.

---`,
  },
  orderAutomation: {
    autoPrintReceipt: true,
    autoPrintDeliveryOrder: true,
    autoSendWhatsAppDelivery: true,
    autoSendCustomerOrder: true,
    deliveryPhone: '',
    groupInviteMessage: '',
    groupInviteLink: '',
  },
  deliveryReminderAutomation: {
    enabled: false,
    hoursBeforeDelivery: 12,
    buttonTitle: 'Confirmar Entrega',
    notifySellerOnConfirmation: true,
    includeRouteLink: true,
    autoUpdateStatusOnConfirm: true,
    reminderTemplate:
      '📦 *LEMBRETE DE ENTREGA - MÓVEIS MORANTE*\n\nOlá {{customerName}}, lembramos que sua entrega está agendada para:\n🗓️ *Data:* {{deliveryDate}}\n⏰ *Horário/Período:* {{deliveryTime}}\n🏠 *Endereço:* {{address}}{{assemblyNotice}}\n\nPor favor, confirme se o local estará acessível no horário agendado.',
    sameDaySpaceReminderTemplate:
      '📦 *LEMBRETE DE MONTAGEM - MÓVEIS MORANTE*\n\nOlá {{customerName}}, para a entrega de hoje do(s) seu(s) móvel(is) *{{furnitureItems}}*, pedimos a gentileza de deixar o espaço limpo e livre no local para a realização da montagem!',
  },
  stockNotificationConditions: ['novo'],
  rolePermissions: Object.fromEntries(
    PERMISSION_ACTIONS.map((permission) => [permission.id, [...permission.defaultRoles]])
  ),
  whatsappTemplates: {
    reviewRequest:
      '*Olá {{customerName}}!* 👋\n\nFicamos muito felizes com sua compra na Móveis Morante! \n\nPoderia nos ajudar avaliando nosso atendimento no Google? Leva menos de 1 minuto e nos ajuda muito: \n\n{{reviewUrl}}\n\nMuito obrigado!',
    orderConfirmation:
      '*Olá {{customerName}}, seu pedido foi confirmado!* 📦\n\n*Vendedor:* {{seller}}\n\n*Anote aí, a sua entrega está agendada para:* \n{{deliveryDate}} | {{deliveryTime}}\n\n*Endereço:* \n{{address}}\n\n*Itens:* \n{{items}}\n\n*Valor Total:* R$ {{totalValue}}\n\n*Pagamento:* \n{{payments}}',
    deliveryInfo:
      '____________________\n\n*Novo Pedido para {{customerName}}* 📦\n\n*Vendedor:* {{seller}}\n\n𝐈𝐌𝐏𝐎𝐑𝐓𝐀𝐍𝐓𝐄:\n{{observation}}\n\n🗓️ *Agendamento:*\n{{deliveryDate}} | {{deliveryTime}}\n\n📞 *Contato:*\n{{phone}}\n\n🏠 *Endereço:*\n{{address}}\n\n🛒 *Itens:*\n{{items}}\n\n💰 *Total:* R$ {{totalValue}}\n\n💳 *Pagamento:*\n{{payments}}\n\n📍🗺️ *Google Maps Rota:*\n{{routeUrl}}',
    assistanceConfirmation:
      '*Olá {{customerName}}!* 🔧\n\nSeu atendimento de assistência técnica foi confirmado! \n\n*Técnico/Responsável:* {{seller}}\n\n🗓️ *Data:* {{assistanceDate}}\n🕒 *Horário:* {{assistanceTime}}\n\n📋 *Descrição do serviço:*\n{{assistanceDescription}}\n\n📞 *Nosso contato:* {{companyPhone}}\n\nEm caso de dúvidas, entre em contato!',
    groupInviteMessage:
      'Se quiser ficar por dentro de novas ofertas e promoções, clique nesse grupo, estarei sempre enviando por lá: {{groupLink}}',
    groupInviteLink: 'https://chat.whatsapp.com/FtqlGwW7pdI9Jzgl8VRia6?mode=gi_t',
  },
  receiptConfig: {
    footerText: '',
    showSeller: true,
    compactMode: false,
  },
  businessRules: {
    allowNegativeStock: true, // Default to true to prevent blocking sales
    autoReserveStock: true,
  },
  inventoryAutomation: {
    autoWithdrawalOnStatus: ['scheduled', 'fulfilled'],
    autoEntryOnPurchaseStatus: ['completed'],
    autoReverseOnCancel: true,
    originLabels: {
      sales: 'Venda de Móveis',
      purchases: 'Compra de Móveis',
      adjustment: 'Ajuste Manual',
    },
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
    },
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
  defaultLabelLayoutIds: {},
  importMappings: [],
  scannerConfig: {
    delay: 1500,
    enableBeep: true,
    vibrate: true,
  },
});
