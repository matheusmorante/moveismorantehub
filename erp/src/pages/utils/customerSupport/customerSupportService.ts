/**
 * customerSupportService.ts
 *
 * Fachada pública do módulo de atendimento ao cliente (Customer Support).
 * Modularizado segundo os princípios de Single Responsibility (SRP) e Separação de Preocupações:
 * - `./customerSupportMessageSync.js`: Sincronização e mudanças de mensagens
 * - `./customerSupportMappers.js`: Mapeamento de linhas do banco para contratos TypeScript
 * - `./customerSupportHistoryService.js`: Histórico, anexos, atividades e busca global
 * - `./customerSupportMessagingService.js`: Envio de mensagens e testes
 * - `./customerSupportQuickSnippets.js`: Modelos e atalhos rápidos padrão
 * - `./customerSupportConversationQuery.js`: Consulta paginada e contagens de conversas
 * - `./customerSupportConversationActions.js`: Ações de leitura, status, arquivamento, tags, notas e atendentes
 */

export { fetchInitialConversationMessagePage, fetchConversationMessageChanges } from './customerSupportMessageSync';
export { removeCustomerSupportMessagesFromCentral } from './customerSupportMessageDeletionService';
export {
  computeConversationStatus,
  mapRowToConversation,
  mapRowToMessage,
} from './customerSupportMappers';

export {
  CONVERSATION_SELECT_COLUMNS,
  MESSAGE_SELECT_COLUMNS,
  fetchConversationMessages,
  fetchPreviousConversationMessages,
  fetchConversationActivityPage,
  fetchConversationAttachmentPage,
  fetchConversationMessageSearchPage,
  fetchGlobalCustomerSupportMessagePage,
  fetchGlobalCustomerSupportContactPage,
  fetchConversationMessageContext,
  fetchConversationReplyTarget,
} from './customerSupportHistoryService';
export type {
  CustomerSupportHistoryCursor,
  CustomerSupportHistoryPage,
  CustomerSupportGlobalSearchPage,
  CustomerSupportGlobalMessageMatch,
  CustomerSupportMessageContext,
} from './customerSupportHistoryService';

export {
  CustomerSupportSendError,
  downloadCustomerSupportForwardFile,
  fetchCustomerSupportWhatsAppSendQuota,
  fetchCustomerSupportWhatsAppUsageDetails,
  fetchCustomerSupportTestSender,
  sendCustomerSupportMessage,
  sendCustomerSupportTestMessage,
} from './customerSupportMessagingService';
export type {
  CustomerSupportSendInput,
  CustomerSupportSendResult,
  CustomerSupportWhatsAppSendQuota,
  CustomerSupportMetaMonthlyUsage,
  CustomerSupportTestSendResult,
  CustomerSupportTestSender,
} from './customerSupportMessagingService';

export * from './customerSupportQuickSnippets';
export * from './customerSupportConversationQuery';
export * from './customerSupportConversationActions';
