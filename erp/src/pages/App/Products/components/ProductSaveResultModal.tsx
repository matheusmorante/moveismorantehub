/**
 * @fileoverview Proxy de re-exportação para ProductSaveResultModal.
 * Mantido na raiz de components para garantir retrocompatibilidade com imports existentes.
 * Implementação canônica em ./modals/ProductSaveResultModal.tsx.
 */

export { ProductSaveResultModal, default } from './modals/ProductSaveResultModal';
export type {
    ProductSaveResultModalProps,
    ProductSaveResult,
    ProductErpChecks,
    ProductEcomChecks,
} from './modals/ProductSaveResultModal';
