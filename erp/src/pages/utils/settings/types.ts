import {
  ImportConfig,
} from '../importMappingTypes';

export interface OrderStatusConfig {
  id: string;
  label: string;
  color: 'slate' | 'amber' | 'emerald' | 'rose' | 'blue' | 'purple' | 'indigo' | 'fuchsia';
  isCore?: boolean;
}

export type OrderTypeColor =
  | 'orange'
  | 'purple'
  | 'green'
  | 'blue'
  | 'amber'
  | 'rose'
  | 'indigo'
  | 'emerald'
  | 'cyan'
  | 'pink'
  | 'red'
  | 'slate';

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
  geminiApiKey?: string;
  storeOriginCoords: [number, number]; // [lng, lat]
  companyName: string;
  companyAddress: string;
  companyCnpj: string;
  companyPhone: string;
  companyIE?: string;
  companyIM?: string;
  companyCRT?: string;
  companyLogradouro?: string;
  companyNumero?: string;
  companyBairro?: string;
  companyCEP?: string;
  companyCMun?: string;
  companyXMun?: string;
  companyUF?: string;
  nfeEnvironment?: 1 | 2;
  nfeSerie?: string;
  nfeNextNumber?: number;
  nfceNextNumber?: number;
  nfeHomologationSerie?: string;
  nfeHomologationNextNumber?: number;
  nfceHomologationNextNumber?: number;
  cscId?: string;
  fiscalDefaults?: {
    ncm?: string;
    cest?: string;
    cfop?: string;
    returnCfop?: string;
    inverseCfopMappings?: Record<string, string>;
    cst?: string;
    icmsPercent?: number;
    origem?: string;
    pisCst?: string;
    cofinsCst?: string;
  };

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
    aiMascot: string; // Global Mascot URL
    aiMascotVariants?: {
      receipt?: string;
      dashboard?: string;
      shippingLabel?: string;
    };
  };
  deliveryReminderAutomation?: {
    enabled: boolean;
    hoursBeforeDelivery: number;
    reminderTemplate?: string;
    sameDaySpaceReminderTemplate?: string;
    buttonTitle?: string;
    notifySellerOnConfirmation?: boolean;
    includeRouteLink?: boolean;
    autoUpdateStatusOnConfirm?: boolean;
  };
  whatsappConfig?: {
    accessToken: string;
    phoneNumberId: string;
    wabaId: string;
    catalogId: string;
    sendMode?: 'graph_api' | 'wame';
    templateNameOrderConfirmation?: string;
    templateLanguage?: string;
    templateVariableCount?: number;
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
    groupInviteMessage: string;
    groupInviteLink: string;
  };
  stockNotificationConditions?: ('novo' | 'usado' | 'salvado')[];
  rolePermissions?: Record<string, string[]>;
  rolePermissionsMigrationVersion?: number;
  whatsappTemplates?: {
    reviewRequest: string;
    orderConfirmation: string;
    deliveryInfo: string;
    assistanceConfirmation: string;
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

  // Configurações Globais
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
  defaultLabelLayoutIds?: Record<string, string>;
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
