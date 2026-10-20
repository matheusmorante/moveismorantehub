/**
 * Fachada do domínio de Inventário de Estoque (Mobile Stock).
 * Reexporta os serviços modulares de escopo, consulta de sessões e mutações/estornos.
 */
export {
  fetchInventoryScopeSuppliers,
  fetchInventoryScopeProducts,
  clearInventoryScopeCache,
  fetchInventoryItems,
  searchProducts,
} from './inventory/inventoryScopeService';

export {
  fetchInventorySessions,
  getNextInventoryCode,
  fetchInventorySessionDetails,
} from './inventory/inventorySessionQueryService';

export {
  recalculateInventoryAuditBalance,
  reverseInventorySession,
  unreverseInventorySession,
  deleteInventoryDraft,
  saveInventoryDraft,
} from './inventory/inventorySessionMutationService';
