/**
 * Re-exportador (shim) para retrocompatibilidade.
 * A implementação foi migrada para @/services/meta-catalog/ (diretório modular).
 * Consumidores que importavam diretamente de '@/services/meta-catalog'
 * continuam funcionando sem alteração. Prefira importar do diretório:
 *   import { ... } from '@/services/meta-catalog/credentials'
 *   import { ... } from '@/services/meta-catalog/formatting'
 *   import { ... } from '@/services/meta-catalog/api'
 */
export * from './meta-catalog/index';
