/**
 * SalesOrderStepPanels — Fachada unificada dos painéis de etapas do formulário de vendas.
 * 
 * Cada etapa possui agora seu próprio componente isolado e arquivo dedicado:
 * - BasicInfoStepSection: Etapa 1 - Dados do vendedor e data do pedido
 * - LogisticsStepSection: Etapa 2 - Frete, entrega, retirada e avisos operacionais
 * - PaymentsStepSection: Etapa 3 - Métodos de pagamento e parcelamento
 * - logisticsNoticeRules: Regras puras de sincronização de tags de aviso e pendências de entrega
 */

export { BasicInfoStepSection } from './BasicInfoStepSection';
export { LogisticsStepSection } from './LogisticsStepSection';
export { PaymentsStepSection } from './PaymentsStepSection';
export {
  CALL_BEFORE_DELIVERY_NOTICE,
  BRING_CARD_MACHINE_NOTICE,
  CALL_ON_ARRIVAL_NOTICE,
  DELIVERY_NOTICE_OPTIONS,
  ASSEMBLY_RESPONSIBLE_NOTICES,
  normalizeNotice,
  hasPendingCardOnDelivery,
  syncDeliveryAndAssemblyNotices,
} from './logisticsNoticeRules';
