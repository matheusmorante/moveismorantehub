import { metaHttpClient } from './metaService/metaHttpClient';
import { metaWhatsAppService } from './metaService/metaWhatsAppService';
import { metaCatalogService } from './metaService/metaCatalogService';
import { metaErrorHandler } from './metaService/metaErrorHandler';

export * from './metaService';

/**
 * Facade unificada para a Meta Graph API (WhatsApp Business Cloud API e Meta Catalog).
 * Preserva 100% da compatibilidade com o ecossistema existente do ERP enquanto delega
 * para os serviços modulares especializados de alta coesão em `metaService/`:
 *
 * - `metaHttpClient`: Conexão HTTP, headers de autenticação e versionamento.
 * - `metaWhatsAppService`: Mensagens de texto, botões interativos e templates.
 * - `metaCatalogService`: Produtos do catálogo, sincronização em lote (items_batch) e coleções.
 * - `metaErrorHandler`: Tradução centralizada de erros da Meta (auto-envio, 24h, regras de template).
 */
export const whatsappGraphService = {
  // HTTP Client & Conectividade
  getHeaders: metaHttpClient.getHeaders,
  testConnection: metaHttpClient.testConnection,
  postMessages: metaHttpClient.postMessages,
  getSenderPhoneStatus: metaHttpClient.getSenderPhoneStatus,
  clearPhoneStatusCache: metaHttpClient.clearPhoneStatusCache,

  // WhatsApp Messaging (Mensageria)
  sendTextMessage: metaWhatsAppService.sendTextMessage,
  sendDocumentMessage: metaWhatsAppService.sendDocumentMessage,
  sendInteractiveButtonMessage: metaWhatsAppService.sendInteractiveButtonMessage,
  fetchMessageTemplates: metaWhatsAppService.fetchMessageTemplates,
  sanitizeTemplateParam: metaWhatsAppService.sanitizeTemplateParam,
  sendTemplateMessage: metaWhatsAppService.sendTemplateMessage,
  formatRecipientPhone: metaWhatsAppService.formatRecipientPhone,
  parseMetaErrorMessage: metaErrorHandler.parseMetaErrorMessage,

  // Meta Catalog (Catálogo & Produtos)
  fetchCatalogProducts: metaCatalogService.fetchCatalogProducts,
  syncProductToCatalog: metaCatalogService.syncProductToCatalog,
  deleteProductFromCatalog: metaCatalogService.deleteProductFromCatalog,
  syncBatchProductsToCatalog: metaCatalogService.syncBatchProductsToCatalog,
  checkBatchStatus: metaCatalogService.checkBatchStatus,
  listProductSets: metaCatalogService.listProductSets,
  deleteProductSet: metaCatalogService.deleteProductSet,
};
