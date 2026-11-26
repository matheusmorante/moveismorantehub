/**
 * Fachada consolidada do serviço financeiro mobile.
 * Reexporta todos os tipos, relatórios, contas a pagar, categorias e CRUDs
 * mantendo 100% de compatibilidade com todos os componentes existentes.
 */

export * from './financial/crud/mobileFinanceTypes';
export * from './financial/crud/mobileCategoryService';
export * from './financial/crud/mobileFinanceReports';
export * from './financial/crud/mobilePayablesService';
export * from './financial/crud/mobileTransactionCrudService';
export * from './financial/crud/mobileDraftConfirmationService';
