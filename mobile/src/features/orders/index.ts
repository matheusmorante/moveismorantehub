/**
 * Ponto de entrada público do módulo de Pedidos Móveis (Sales Orders).
 *
 * Invariante Arquitetural:
 * Este módulo mobile é estritamente de consulta, visualização e acompanhamento de entregas.
 * Nenhuma criação ou edição de pedidos é permitida no aplicativo mobile (somente no ERP).
 */

// Telas
export { NativeOrdersScreen } from './screens/NativeOrdersScreen';
export { DeliveryPreparationScreen } from './screens/DeliveryPreparationScreen';

// Componentes
export { MobileOrderCard } from './components/MobileOrderCard';
export { OrdersHeader } from './components/OrdersHeader';
export { MobileOrderPagination } from './components/MobileOrderPagination';
export { SlideHoldToStart } from './components/SlideHoldToStart';
export { OrderCardBadges } from './components/card/OrderCardBadges';
export { OrderCardBody } from './components/card/OrderCardBody';
export { OrderCardFiscalBadges } from './components/card/OrderCardFiscalBadges';
export { resolveHeaderColors, getStatusConfig } from './components/card/orderCardTheme';

// Hooks
export { useMobileOrders } from './hooks/useMobileOrders';

// Regras de Domínio
export {
  getOrderAssemblyFlags,
  isPaidTrafficOrder,
  isHandlingDepot,
  isHandlingOutside,
} from './domain/orderAssemblyRules';
export {
  getOrderStatusPresentation,
  getOrderStatusLabel,
  getOrderStatusBadgeVariant,
} from './domain/orderStatusPresentation';

// Tipos
export type {
  FiscalBadgeStatus,
  FiscalOperationBadgeStatus,
  MobileOrderListItem,
  MobileFiscalBadgeStatuses,
  FiscalDocumentStatusRow,
  MobileOrderStatusFilter,
  MobileOrderType,
  OrderPresentationInput,
} from './domain/types';

// Serviços
export {
  fetchMobileOrdersPage,
  loadMobileOrdersSnapshot,
} from './services/mobileOrderListService';
