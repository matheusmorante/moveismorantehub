/**
 * @fileoverview Proxy de re-exportação para useInventoryOrdersLookup.
 * Mantido em components/ para garantir retrocompatibilidade com imports legados.
 * Implementação canônica em ../hooks/useInventoryOrdersLookup.ts.
 */

export { useInventoryOrdersLookup, default } from '../Movements/hooks/useInventoryOrdersLookup';
export type { InventoryOrdersLookupResult } from '../Movements/hooks/useInventoryOrdersLookup';
