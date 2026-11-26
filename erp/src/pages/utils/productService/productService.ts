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
// - productVariationActionsService.ts: salvar variação, mover entre famílias, fundir variações
// - productWhatsAppSyncService.ts: sincronização do catálogo com WhatsApp
// - productMaintenanceService.ts: conversão em massa, limpeza de rascunhos, migração
// ============================================================================

export * from './mapping/productImageHelpers';
export * from './drafts/productLocalCache';
export * from './mutations/productSkuService';
export * from './mapping/productMapper';
export * from './queries/productQueryService';
export * from './mutations/productPersistenceService';
export * from './mutations/productMutationService';
export * from './mutations/productVariationActionsService';
export * from './mutations/productDuplicateMergeService';
export * from './catalog/productWhatsAppSyncService';
export * from './mutations/productMaintenanceService';
export * from './queries/productDependencyCheck';
export * from './mapping/productValidation';
export * from './queries/productAnalyticsQueryService';
export * from './mapping/productDimensionsExtractor';
export * from './mapping/productFilterBuilder';
export * from './mapping/productToDbMapper';
export * from './mapping/productVariationMapper';
export * from './productFiscalDataService';
