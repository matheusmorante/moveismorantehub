/**
 * Fachada pública para as regras dos rótulos fiscais e situação do pedido de venda.
 * Implementação modular sob `./orderFiscalBadge/`.
 */
export * from './orderFiscalBadge/orderFiscalBadgeRules.types';
export * from './orderFiscalBadge/fiscalDocumentPredicates';
export * from './orderFiscalBadge/operationBadgeRules';
export * from './orderFiscalBadge/returnBadgeRules';
export * from './orderFiscalBadge/orderFiscalSituationClassifier';
export * from './orderFiscalBadge/orderFiscalCancellationRules';
export * from './orderFiscalBadge/orderFiscalBadgePairResolver';
