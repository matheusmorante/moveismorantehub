/**
 * @fileoverview Proxy de re-exportação para ProductRow.
 * Mantido na raiz de ProductList para garantir retrocompatibilidade absoluta com imports existentes.
 * Implementação canônica localizada em ./components/ProductRow.tsx.
 */

export { ProductRow, default } from './components/ProductRow';
export type { ProductRowProps } from './components/ProductRow';
