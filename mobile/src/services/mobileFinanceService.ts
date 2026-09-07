/**
 * Fachada consolidada do serviço financeiro mobile.
 * Reexporta todos os tipos, relatórios, contas a pagar, categorias e CRUDs
 * mantendo 100% de compatibilidade com todos os componentes existentes.
 */

export * from './financial/mobileFinanceTypes';
export * from './financial/mobileCategoryService';
export * from './financial/mobileFinanceReports';
export * from './financial/mobilePayablesService';
export * from './financial/mobileTransactionCrudService';
export * from './financial/mobileDraftConfirmationService';
