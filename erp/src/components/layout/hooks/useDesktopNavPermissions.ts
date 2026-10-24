import { useMemo } from 'react';
import type { UserProfile } from '../../../context/AuthContext';
import { canPerform } from '../../../pages/utils/permissionService';
import { getProfileRoles } from '../../../pages/utils/accessRoles';
import { canSeeFinanceModuleBeta, canUseFinanceModule } from '../../../pages/utils/permissionConfig';

export interface DesktopNavPermissions {
  // Roles
  roles: readonly string[];
  canViewDashboard: boolean;

  // Central de Atendimento
  canViewCustomerSupport: boolean;

  // Produtos
  canViewProducts: boolean;
  canViewProductCharacteristics: boolean;
  canViewProductCategories: boolean;
  canViewProductReconciliation: boolean;
  canViewMetaCatalog: boolean;
  canViewProductMenu: boolean;

  // Estoque
  canViewStockMovements: boolean;
  canViewStockInventory: boolean;
  canViewStockUnavailabilities: boolean;
  canViewStockPurchases: boolean;
  canViewStockReceipts: boolean;
  canViewStockLabels: boolean;
  canViewSuppliers: boolean;
  canViewStock: boolean;

  // Pessoas
  canViewCustomers: boolean;
  canViewEmployees: boolean;
  canViewCustomerDesires: boolean;
  canViewPeople: boolean;

  // Vendas
  canViewOrdersList: boolean;
  canViewBudgets: boolean;
  canViewAssistanceOrders: boolean;
  canViewReturns: boolean;
  canViewOrders: boolean;

  // Fiscal
  canViewFiscalOutbound: boolean;
  canViewInboundFiscal: boolean;
  canViewNcmCatalog: boolean;
  canViewFiscal: boolean;

  // Logística
  canViewDeliverySchedule: boolean;
  canViewAssemblyList: boolean;
  canViewLogistics: boolean;

  // Marketing
  canViewMarketingPosts: boolean;
  canViewWhatsAppMarketplace: boolean;
  canViewMarketing: boolean;

  // Financeiro
  canUseFinance: boolean;
  canSeeFinanceBeta: boolean;
  canViewFinanceTransactions: boolean;
  canViewFinancePayables: boolean;
  canViewFinanceReceivables: boolean;
  canViewFinanceSettings: boolean;
}

export function useDesktopNavPermissions(profile: UserProfile | null): DesktopNavPermissions {
  return useMemo(() => {
    const roles = profile ? getProfileRoles(profile) : [];
    const canViewDashboard = roles.some((role) => role === 'administrator' || role === 'manager');

    // Produtos
    const canViewProducts = canPerform('viewProducts', roles);
    const canViewProductCharacteristics = canPerform('viewProductCharacteristics', roles);
    const canViewProductCategories = canPerform('viewProductCategories', roles);
    const canViewProductReconciliation = canPerform('viewProductReconciliation', roles);
    const canViewMetaCatalog = canPerform('viewMetaCatalog', roles);
    const canViewProductMenu =
      canViewProducts ||
      canViewProductCharacteristics ||
      canViewProductCategories ||
      canViewProductReconciliation ||
      canViewMetaCatalog;

    // Estoque
    const canViewStockMovements = canPerform('viewStockMovements', roles);
    const canViewStockInventory = canPerform('viewStockInventory', roles);
    const canViewStockUnavailabilities = canPerform('viewStockUnavailabilities', roles);
    const canViewStockPurchases = canPerform('viewStockPurchases', roles);
    const canViewStockReceipts = canPerform('viewStockReceipts', roles);
    const canViewStockLabels = canPerform('viewStockLabels', roles);
    const canViewSuppliers = canPerform('viewSuppliers', roles);
    const canViewStock =
      canViewStockMovements ||
      canViewStockInventory ||
      canViewStockUnavailabilities ||
      canViewStockPurchases ||
      canViewStockReceipts ||
      canViewStockLabels;

    // Pessoas
    const canViewCustomers = canPerform('viewCustomers', roles);
    const canViewEmployees = canPerform('viewEmployees', roles);
    const canViewCustomerDesires = canPerform('viewCustomerDesires', roles);
    const canViewPeople = canViewCustomers || canViewEmployees || canViewCustomerDesires;

    // Vendas
    const canViewOrdersList = canPerform('viewOrders', roles);
    const canViewBudgets = canPerform('viewBudgets', roles);
    const canViewAssistanceOrders = canPerform('viewAssistanceOrders', roles);
    const canViewReturns = canPerform('viewReturns', roles);
    const canViewOrders =
      canViewOrdersList ||
      canViewBudgets ||
      canViewAssistanceOrders ||
      canViewReturns;

    // Fiscal
    const canViewFiscalOutbound = canPerform('viewFiscal', roles);
    const canViewInboundFiscal = canPerform('viewInboundFiscal', roles);
    const canViewNcmCatalog = canPerform('viewNcmCatalog', roles);
    const canViewFiscal = canViewFiscalOutbound || canViewInboundFiscal || canViewNcmCatalog;

    // Logística
    const canViewDeliverySchedule = canPerform('viewDeliverySchedule', roles);
    const canViewAssemblyList = canPerform('viewAssemblyList', roles);
    const canViewLogistics = canViewDeliverySchedule || canViewAssemblyList;

    // Marketing
    const canViewMarketingPosts = canPerform('viewMarketingPosts', roles);
    const canViewWhatsAppMarketplace = canPerform('viewWhatsAppMarketplace', roles);
    const canViewMarketing =
      canViewMarketingPosts ||
      canPerform('viewChannelCatalog', roles) ||
      canViewMetaCatalog ||
      canViewWhatsAppMarketplace;

    // Financeiro
    const canUseFinance = canUseFinanceModule(roles);
    const canSeeFinanceBeta = canSeeFinanceModuleBeta(roles);
    const canViewFinanceTransactions = canPerform('viewFinanceTransactions', roles);
    const canViewFinancePayables = canPerform('viewFinancePayables', roles);
    const canViewFinanceReceivables = canPerform('viewFinanceReceivables', roles);
    const canViewFinanceSettings = canPerform('viewFinanceSettings', roles);

    // Central de Atendimento
    const canViewCustomerSupport = canPerform('viewCustomerSupport', roles);

    return {
      roles,
      canViewDashboard,
      canViewCustomerSupport,
      canViewProducts,
      canViewProductCharacteristics,
      canViewProductCategories,
      canViewProductReconciliation,
      canViewMetaCatalog,
      canViewProductMenu,
      canViewStockMovements,
      canViewStockInventory,
      canViewStockUnavailabilities,
      canViewStockPurchases,
      canViewStockReceipts,
      canViewStockLabels,
      canViewSuppliers,
      canViewStock,
      canViewCustomers,
      canViewEmployees,
      canViewCustomerDesires,
      canViewPeople,
      canViewOrdersList,
      canViewBudgets,
      canViewAssistanceOrders,
      canViewReturns,
      canViewOrders,
      canViewFiscalOutbound,
      canViewInboundFiscal,
      canViewNcmCatalog,
      canViewFiscal,
      canViewDeliverySchedule,
      canViewAssemblyList,
      canViewLogistics,
      canViewMarketingPosts,
      canViewWhatsAppMarketplace,
      canViewMarketing,
      canUseFinance,
      canSeeFinanceBeta,
      canViewFinanceTransactions,
      canViewFinancePayables,
      canViewFinanceReceivables,
      canViewFinanceSettings,
    };
  }, [profile]);
}

export default useDesktopNavPermissions;
