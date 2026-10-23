import { z } from 'zod';

// Explicit structural contract from the existing application settings domain.
// Contextual service permissions and fiscal checks remain authoritative.
export const OrderStatusConfigFormSchema = z.object({
  "id": z.string(),
  "label": z.string(),
  "color": z.enum(['slate', 'amber', 'emerald', 'rose', 'blue', 'purple', 'indigo', 'fuchsia']),
  "isCore": z.boolean().optional(),
}).passthrough();

export const OrderTypeColorFormSchema = z.enum(['orange', 'purple', 'green', 'blue', 'amber', 'rose', 'indigo', 'emerald', 'cyan', 'pink', 'red', 'slate']);

export const HandlingOptionFormSchema = z.object({
  "label": z.string(),
  "includeInAssemblySchedule": z.boolean(),
  "isAssemblyOutside": z.boolean().optional(),
  "color": z.string().optional(),
}).passthrough();

export const CardFlagRuleFormSchema = z.object({
  "flag": z.string(),
  "interestRates": z.array(z.object({
  "installments": z.number(),
  "rate": z.number(),
}).passthrough()),
}).passthrough();

export const EntityTypeFormSchema = z.enum(['product', 'variation', 'customer', 'supplier', 'order', 'receivable']);

export const ColumnMappingFormSchema = z.object({
  "erpField": z.string(),
  "csvHeader": z.string(),
  "defaultValue": z.unknown().optional(),
  "transform": z.custom<(...args: unknown[]) => unknown>((value) => typeof value === 'function').optional(),
}).passthrough();

export const ImportConfigFormSchema = z.object({
  "id": z.string(),
  "name": z.string(),
  "entityType": EntityTypeFormSchema,
  "delimiter": z.string(),
  "mappings": z.array(ColumnMappingFormSchema),
}).passthrough();

export const AppSettingsFormSchema = z.object({
  "showManualFulfillmentPrompt": z.boolean(),
  "autoSaveOnlyWhenDirty": z.boolean(),
  "statusLabels": z.object({
  "draft": z.string(),
  "scheduled": z.string(),
  "fulfilled": z.string(),
  "cancelled": z.string(),
}).passthrough().optional(),
  "orderStatuses": z.array(OrderStatusConfigFormSchema),
  "orderTypeLabels": z.object({
  "delivery": z.string(),
  "pickup": z.string(),
  "assistance": z.string(),
  "budget": z.string(),
  "return": z.string(),
}).passthrough(),
  "orderTypeColors": z.object({
  "delivery": OrderTypeColorFormSchema,
  "pickup": OrderTypeColorFormSchema,
  "assistance": OrderTypeColorFormSchema,
  "budget": OrderTypeColorFormSchema,
  "return": OrderTypeColorFormSchema,
}).passthrough(),
  "deliveryHandlingOptions": z.array(HandlingOptionFormSchema),
  "pickupHandlingOptions": z.array(HandlingOptionFormSchema),
  "cardFlagRules": z.array(CardFlagRuleFormSchema),
  "freightPerKm": z.number(),
  "storeOriginCoords": z.tuple([z.number(), z.number()]),
  "companyName": z.string(),
  "companyDanfeLogoUrl": z.string().trim().max(2048).refine((value) => !value || ((value.startsWith('/') && !value.startsWith('//') && !value.includes('..') && !value.includes('\\')) || /^https:\/\/\S+$/i.test(value)), 'Use um caminho público da aplicação ou uma URL HTTPS para o logotipo.').optional(),
  "companyAddress": z.string(),
  "companyCnpj": z.string(),
  "companyPhone": z.string(),
  "companyIE": z.string().optional(),
  "companyIM": z.string().optional(),
  "companyCRT": z.string().optional(),
  "companyLogradouro": z.string().optional(),
  "companyNumero": z.string().optional(),
  "companyBairro": z.string().optional(),
  "companyCEP": z.string().optional(),
  "companyCMun": z.string().optional(),
  "companyXMun": z.string().optional(),
  "companyUF": z.string().optional(),
  "nfeEnvironment": z.union([z.literal(1), z.literal(2)]).optional(),
  "nfeSerie": z.string().optional(),
  "nfeNextNumber": z.number().optional(),
  "nfceNextNumber": z.number().optional(),
  "nfeHomologationSerie": z.string().optional(),
  "nfeHomologationNextNumber": z.number().optional(),
  "nfceHomologationNextNumber": z.number().optional(),
  "cscId": z.string().optional(),
  "fiscalDefaults": z.object({
  "ncm": z.string().optional(),
  "cest": z.string().optional(),
  "cfop": z.string().optional(),
  "returnCfop": z.string().optional(),
  "inverseCfopMappings": z.record(z.string(), z.string()).optional(),
  "cst": z.string().optional(),
  "icmsPercent": z.number().optional(),
  "origem": z.string().optional(),
  "pisCst": z.string().optional(),
  "cofinsCst": z.string().optional(),
}).passthrough().optional(),
  "autoCapitalizeCustomerData": z.boolean(),
  "googleReviewUrl": z.string(),
  "defaultTheme": z.enum(['light', 'dark']),
  "autoScroll": z.object({
  "orderTable": z.boolean(),
  "scheduleCards": z.boolean(),
  "scheduleTable": z.boolean(),
}).passthrough(),
  "showScheduleNoticeLabels": z.boolean(),
  "speed": z.number(),
  "threshold": z.number(),
  "aiPrompts": z.object({
  "productDescription": z.string(),
  "ecommerceTemplate": z.string(),
  "whatsappTemplate": z.string(),
  "generalChat": z.string(),
  "taskDetection": z.string(),
  "aiName": z.string(),
  "aiAvatar": z.string(),
  "aiMascot": z.string(),
  "aiMascotVariants": z.object({
  "receipt": z.string().optional(),
  "dashboard": z.string().optional(),
  "shippingLabel": z.string().optional(),
}).passthrough().optional(),
}).passthrough(),
  "deliveryReminderAutomation": z.object({
  "enabled": z.boolean(),
  "hoursBeforeDelivery": z.number(),
  "reminderTemplate": z.string().optional(),
  "sameDaySpaceReminderTemplate": z.string().optional(),
  "buttonTitle": z.string().optional(),
  "notifySellerOnConfirmation": z.boolean().optional(),
  "includeRouteLink": z.boolean().optional(),
  "autoUpdateStatusOnConfirm": z.boolean().optional(),
}).passthrough().optional(),
  "whatsappConfig": z.object({
  "phoneNumberId": z.string(),
  "wabaId": z.string(),
  "catalogId": z.string(),
  "sendMode": z.enum(['graph_api', 'wame']).optional(),
  "templateNameOrderConfirmation": z.string().optional(),
  "templateLanguage": z.string().optional(),
  "templateVariableCount": z.number().optional(),
}).passthrough().optional(),
  "channelBaseDescriptions": z.object({
  "whatsapp": z.string(),
  "ecommerce": z.string(),
}).passthrough(),
  "orderAutomation": z.object({
  "autoPrintReceipt": z.boolean(),
  "autoPrintDeliveryOrder": z.boolean(),
  "autoSendWhatsAppDelivery": z.boolean(),
  "autoSendCustomerOrder": z.boolean(),
  "deliveryPhone": z.string(),
  "groupInviteMessage": z.string(),
  "groupInviteLink": z.string(),
}).passthrough(),
  "stockNotificationConditions": z.array(z.enum(['novo', 'usado', 'salvado'])).optional(),
  "rolePermissions": z.record(z.string(), z.array(z.string())).optional(),
  "rolePermissionsMigrationVersion": z.number().optional(),
  "whatsappTemplates": z.object({
  "reviewRequest": z.string(),
  "orderConfirmation": z.string(),
  "deliveryInfo": z.string(),
  "assistanceConfirmation": z.string(),
  "groupInviteMessage": z.string(),
  "groupInviteLink": z.string(),
}).passthrough().optional(),
  "receiptConfig": z.object({
  "footerText": z.string(),
  "showSeller": z.boolean(),
  "compactMode": z.boolean(),
}).passthrough(),
  "businessRules": z.object({
  "allowNegativeStock": z.boolean(),
  "autoReserveStock": z.boolean(),
}).passthrough(),
  "inventoryAutomation": z.object({
  "autoWithdrawalOnStatus": z.array(z.string()),
  "autoEntryOnPurchaseStatus": z.array(z.string()),
  "autoReverseOnCancel": z.boolean(),
  "originLabels": z.object({
  "sales": z.string(),
  "purchases": z.string(),
  "adjustment": z.string(),
}).passthrough(),
}).passthrough(),
  "requiredFields": z.object({
  "customer": z.object({
  "cpfCnpj": z.boolean(),
  "rgIe": z.boolean(),
  "email": z.boolean(),
  "phone": z.boolean(),
  "position": z.boolean(),
  "address": z.boolean(),
}).passthrough(),
  "product": z.object({
  "code": z.boolean(),
  "brand": z.boolean(),
  "costPrice": z.boolean(),
  "minStock": z.boolean(),
}).passthrough(),
  "salesOrder": z.object({
  "seller": z.boolean(),
  "customer": z.boolean(),
}).passthrough(),
  "assistanceOrder": z.object({
  "seller": z.boolean(),
  "customer": z.boolean(),
}).passthrough(),
}).passthrough(),
  "securityOptions": z.object({
  "sessionTimeoutMinutes": z.number(),
  "requireManagerForDeletion": z.boolean(),
}).passthrough(),
  "financialOptions": z.object({
  "currencySymbol": z.string(),
  "decimalSeparator": z.string(),
  "thousandSeparator": z.string(),
  "autoRoundPrices": z.boolean(),
}).passthrough(),
  "operatingHours": z.object({
  "start": z.string(),
  "end": z.string(),
  "timezone": z.string(),
}).passthrough(),
  "defaultLabelLayoutIds": z.record(z.string(), z.string()).optional(),
  "importMappings": z.array(ImportConfigFormSchema),
  "scannerConfig": z.object({
  "delay": z.number(),
  "enableBeep": z.boolean(),
  "vibrate": z.boolean(),
}).passthrough(),
}).passthrough();
