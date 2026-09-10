// ============================================================================
// BARREL EXPORT & ENTRY POINT: productService
//
// Este arquivo foi modularizado seguindo os princípios de Código Limpo, SOLID e
// Responsabilidade Única (Single Responsibility Principle) conforme a skill
// `.agents/skills/modularizacao_codigo`.
//
// Cada subdomínio agora reside em seu respectivo módulo na pasta `productService/`:
// - productImageHelpers.ts: limites de fotos, parsing de imagens de variação
// - productLocalCache.ts: persistência em localStorage e notificações a assinantes
// - productSkuService.ts: cálculo e validação de SKU comercial e código sequencial
// - productMapper.ts: mapeamento bidirecional BD Supabase ↔ Entidade de Domínio
// - productQueryService.ts: paginação, busca insensível a acentos, estatísticas
// - productPersistenceService.ts: upsert no Supabase, relacionamentos de categorias e imagens
// - productMutationService.ts: salvar, atualizar, desativar e deleção em lote
// - productVariationActionsService.ts: salvar variação, mover entre famílias, mesclar variações
// - productWhatsAppSyncService.ts: sincronização do catálogo com WhatsApp
// - productMaintenanceService.ts: conversão em massa, limpeza de rascunhos, migração
// ============================================================================

export * from './productService/productImageHelpers';
export * from './productService/productLocalCache';
export * from './productService/productSkuService';
export * from './productService/productMapper';
export * from './productService/productQueryService';
export * from './productService/productPersistenceService';
export * from './productService/productMutationService';
export * from './productService/productVariationActionsService';
export * from './productService/productWhatsAppSyncService';
export * from './productService/productMaintenanceService';
