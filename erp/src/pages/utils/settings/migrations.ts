import { AppSettings, HandlingOption } from './types';
import {
  MORANTE_DELIVERY_HANDLING_OPTIONS,
  MORANTE_PICKUP_HANDLING_OPTIONS,
  settingsUseGenericDefaults,
} from '../handlingMigration';
import { PERMISSION_ACTIONS } from '../permissionConfig';

/**
 * Migra configurações antigas para o novo formato e remove dados legados ou sensíveis
 */
export const migrateSettings = (settings: any): AppSettings => {
  if (!settings) return settings;
  // Legacy fiscal credentials must not survive in browser storage or cloud sync.
  for (const key of [
    'certificateBase64',
    'certificatePassword',
    'certificateFileName',
    'cscToken',
  ]) {
    delete settings[key];
  }

  if ((settings.rolePermissionsMigrationVersion ?? 0) < 1) {
    const rolePermissions = settings.rolePermissions || {};
    const addStockistPermission = (roles: unknown, defaults: string[]): string[] => [
      ...new Set([...(Array.isArray(roles) ? roles : defaults), 'stockist']),
    ];

    settings.rolePermissions = {
      ...rolePermissions,
      viewProducts: addStockistPermission(rolePermissions.viewProducts, [
        'manager',
        'seller',
        'deliverer',
      ]),
      productConfig: addStockistPermission(rolePermissions.productConfig, ['manager']),
    };
    settings.rolePermissionsMigrationVersion = 1;
  }

  if ((settings.rolePermissionsMigrationVersion ?? 0) < 2) {
    const rolePermissions = settings.rolePermissions || {};
    const ensureCatalogReadAccess = (): string[] => {
      const roles = Array.isArray(rolePermissions.viewProducts)
        ? rolePermissions.viewProducts
        : ['manager', 'stockist'];
      return [...new Set([...roles, 'seller', 'deliverer'])];
    };
    const removeDeliverer = (action: string, defaults: string[]): string[] => {
      const roles = Array.isArray(rolePermissions[action]) ? rolePermissions[action] : defaults;
      return roles.filter((role: string) => role !== 'deliverer');
    };

    settings.rolePermissions = {
      ...rolePermissions,
      viewProducts: ensureCatalogReadAccess(),
      productConfig: removeDeliverer('productConfig', ['manager', 'stockist', 'seller']),
      viewOrders: removeDeliverer('viewOrders', ['manager']),
      createEditOrders: removeDeliverer('createEditOrders', ['manager']),
      viewPeople: removeDeliverer('viewPeople', ['manager']),
      createEditPeople: removeDeliverer('createEditPeople', ['manager']),
      viewFinancials: removeDeliverer('viewFinancials', ['manager', 'accountant']),
      exportReports: removeDeliverer('exportReports', ['manager', 'accountant']),
      viewFiscal: removeDeliverer('viewFiscal', ['manager', 'accountant']),
      viewMarketing: removeDeliverer('viewMarketing', ['manager']),
    };
    settings.rolePermissionsMigrationVersion = 2;
  }

  if ((settings.rolePermissionsMigrationVersion ?? 0) < 3) {
    const rolePermissions = settings.rolePermissions || {};
    const updateRoles = (
      action: string,
      defaults: string[],
      add: string[] = [],
      remove: string[] = []
    ): string[] => {
      const existing = Array.isArray(rolePermissions[action])
        ? rolePermissions[action]
        : defaults;
      return [...new Set([...existing.filter((role: string) => !remove.includes(role)), ...add])];
    };

    settings.rolePermissions = {
      ...rolePermissions,
      viewProducts: updateRoles('viewProducts', ['manager', 'seller', 'deliverer', 'stockist'], [
        'seller',
        'deliverer',
      ]),
      viewStock: updateRoles('viewStock', ['manager', 'deliverer', 'stockist'], [], ['seller']),
      viewSuppliers: updateRoles('viewSuppliers', ['manager', 'stockist'], ['seller'], [
        'deliverer',
      ]),
      productConfig: updateRoles(
        'productConfig',
        ['manager', 'stockist', 'seller'],
        ['seller'],
        ['deliverer']
      ),
      deleteProducts: updateRoles('deleteProducts', ['manager', 'seller'], ['seller'], [
        'deliverer',
      ]),
      viewOrders: updateRoles('viewOrders', ['manager'], [], ['seller', 'deliverer']),
      createEditOrders: updateRoles('createEditOrders', ['manager'], [], ['seller', 'deliverer']),
      viewPeople: updateRoles('viewPeople', ['manager'], [], ['seller', 'deliverer']),
      createEditPeople: updateRoles('createEditPeople', ['manager'], [], ['seller', 'deliverer']),
      viewFinancials: updateRoles('viewFinancials', ['manager', 'accountant'], [], [
        'seller',
        'deliverer',
      ]),
      exportReports: updateRoles('exportReports', ['manager', 'accountant'], [], [
        'seller',
        'deliverer',
      ]),
      viewFiscal: updateRoles('viewFiscal', ['manager', 'accountant'], [], [
        'seller',
        'deliverer',
      ]),
      viewMarketing: updateRoles('viewMarketing', ['manager'], [], ['seller', 'deliverer']),
    };
    settings.rolePermissionsMigrationVersion = 3;
  }

  if ((settings.rolePermissionsMigrationVersion ?? 0) < 4) {
    const rolePermissions = settings.rolePermissions || {};
    const inheritedFrom: Record<string, string> = {
      viewBudgets: 'viewOrders',
      viewAssistanceOrders: 'viewOrders',
      viewReturns: 'viewOrders',
      viewSalesReports: 'viewOrders',
      exportSalesReports: 'exportReports',
      viewProductCharacteristics: 'productConfig',
      viewProductCategories: 'productConfig',
      viewProductCompositions: 'productConfig',
      viewProductReconciliation: 'productConfig',
      viewStockMovements: 'viewStock',
      manualStockMovement: 'viewStock',
      viewStockInventory: 'viewStock',
      viewStockUnavailabilities: 'viewStock',
      viewStockPurchases: 'viewStock',
      viewStockReceipts: 'viewStock',
      viewStockLabels: 'viewStock',
      viewBlingStock: 'viewStock',
      viewSuppliers: 'viewStock',
      viewMarketingPosts: 'viewMarketing',
      viewChannelCatalog: 'viewMarketing',
      viewMetaCatalog: 'viewMarketing',
      viewWhatsAppMarketplace: 'viewMarketing',
      viewCustomers: 'viewPeople',
      deletePeople: 'viewPeople',
      viewEmployees: 'viewPeople',
      viewServices: 'viewPeople',
      viewCustomerDesires: 'viewPeople',
      viewInboundFiscal: 'viewFiscal',
      viewNcmCatalog: 'viewFiscal',
      viewFinanceTransactions: 'viewFinancials',
      viewFinancePayables: 'viewFinancials',
      viewFinanceReceivables: 'viewFinancials',
      viewFinanceSettings: 'viewFinancials',
      exportReports: 'viewFinancials',
    };
    const nextPermissions = { ...rolePermissions };

    for (const permission of PERMISSION_ACTIONS) {
      if (nextPermissions[permission.id] !== undefined) continue;
      const inheritedRoles = inheritedFrom[permission.id]
        ? nextPermissions[inheritedFrom[permission.id]]
        : undefined;
      nextPermissions[permission.id] = Array.isArray(inheritedRoles)
        ? [...inheritedRoles]
        : [...permission.defaultRoles];
    }

    settings.rolePermissions = nextPermissions;
    settings.rolePermissionsMigrationVersion = 4;
  }

  if ((settings.rolePermissionsMigrationVersion ?? 0) < 5) {
    const rolePermissions = settings.rolePermissions || {};
    const identificationLabelDefaults =
      PERMISSION_ACTIONS.find((permission) => permission.id === 'printProductIdentificationLabels')
        ?.defaultRoles || [];
    const blingStockRoles = Array.isArray(rolePermissions.viewBlingStock)
      ? rolePermissions.viewBlingStock
      : PERMISSION_ACTIONS.find((permission) => permission.id === 'viewBlingStock')?.defaultRoles || [];

    settings.rolePermissions = {
      ...rolePermissions,
      viewBlingStock: blingStockRoles.filter((role: string) => role !== 'stockist'),
      printProductIdentificationLabels: Array.isArray(rolePermissions.printProductIdentificationLabels)
        ? rolePermissions.printProductIdentificationLabels
        : [...identificationLabelDefaults],
    };
    settings.rolePermissionsMigrationVersion = 5;
  }

  if ((settings.rolePermissionsMigrationVersion ?? 0) < 6) {
    const rolePermissions = settings.rolePermissions || {};
    const ensureAccountantFiscalAccess = (action: string): string[] => {
      const defaults = PERMISSION_ACTIONS.find((permission) => permission.id === action)?.defaultRoles || [];
      const roles = Array.isArray(rolePermissions[action]) ? rolePermissions[action] : defaults;
      return [...new Set([...roles, 'accountant'])];
    };

    settings.rolePermissions = {
      ...rolePermissions,
      viewFiscal: ensureAccountantFiscalAccess('viewFiscal'),
      viewInboundFiscal: ensureAccountantFiscalAccess('viewInboundFiscal'),
      viewNcmCatalog: ensureAccountantFiscalAccess('viewNcmCatalog'),
    };
    settings.rolePermissionsMigrationVersion = 6;
  }

  if ((settings.rolePermissionsMigrationVersion ?? 0) < 7) {
    const rolePermissions = settings.rolePermissions || {};
    const fiscalModuleRoles = ['administrator', 'manager', 'accountant', 'seller', 'stockist'];

    settings.rolePermissions = {
      ...rolePermissions,
      viewFiscal: [...fiscalModuleRoles],
      viewInboundFiscal: [...fiscalModuleRoles],
      viewNcmCatalog: [...fiscalModuleRoles],
    };
    settings.rolePermissionsMigrationVersion = 7;
  }

  if ((settings.rolePermissionsMigrationVersion ?? 0) < 8) {
    const rolePermissions = settings.rolePermissions || {};
    const removeStockistDefault = (action: string): string[] => {
      const defaults = PERMISSION_ACTIONS.find((permission) => permission.id === action)?.defaultRoles || [];
      const roles = Array.isArray(rolePermissions[action]) ? rolePermissions[action] : defaults;
      return roles.filter((role: string) => role !== 'stockist');
    };

    settings.rolePermissions = {
      ...rolePermissions,
      viewProductCategories: removeStockistDefault('viewProductCategories'),
      viewProductCompositions: removeStockistDefault('viewProductCompositions'),
      viewProductReconciliation: removeStockistDefault('viewProductReconciliation'),
    };
    settings.rolePermissionsMigrationVersion = 8;
  }

  // Migração de manuseio: string[] -> HandlingOption[]
  if (
    settings.deliveryHandlingOptions &&
    settings.deliveryHandlingOptions.length > 0 &&
    typeof settings.deliveryHandlingOptions[0] === 'string'
  ) {
    settings.deliveryHandlingOptions = settings.deliveryHandlingOptions.map((label: string) => ({
      label,
      includeInAssemblySchedule: label.toLowerCase().includes('montagem'),
      isAssemblyOutside:
        label.toLowerCase().includes('fora') ||
        label.toLowerCase().includes('local') ||
        (label.toLowerCase().includes('entrega') && label.toLowerCase().includes('mostruario')),
    }));
  }
  if (
    settings.pickupHandlingOptions &&
    settings.pickupHandlingOptions.length > 0 &&
    typeof settings.pickupHandlingOptions[0] === 'string'
  ) {
    settings.pickupHandlingOptions = settings.pickupHandlingOptions.map((label: string) => ({
      label,
      includeInAssemblySchedule: label.toLowerCase().includes('montagem'),
      isAssemblyOutside:
        label.toLowerCase().includes('fora') ||
        label.toLowerCase().includes('local') ||
        (label.toLowerCase().includes('entrega') && label.toLowerCase().includes('mostruario')),
    }));
  }

  // Restaura manuseios reais da Morante se as configurações ainda usam os padrões genéricos
  if (settingsUseGenericDefaults(settings.deliveryHandlingOptions)) {
    settings.deliveryHandlingOptions = MORANTE_DELIVERY_HANDLING_OPTIONS;
  }
  if (settingsUseGenericDefaults(settings.pickupHandlingOptions)) {
    settings.pickupHandlingOptions = MORANTE_PICKUP_HANDLING_OPTIONS;
  }

  if (!settings.googleMapsApiKey || !settings.googleMapsApiKey.trim()) {
    settings.googleMapsApiKey =
      (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string)?.trim() || '__REDACTED_GCP_API_KEY__';
  }

  if (!settings.geminiApiKey || !settings.geminiApiKey.trim()) {
    settings.geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() || '';
  }

  return settings as AppSettings;
};
