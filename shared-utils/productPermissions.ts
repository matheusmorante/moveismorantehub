export type ProductPermissionRole =
  | 'administrator'
  | 'manager'
  | 'stockist'
  | 'seller'
  | 'deliverer'
  | 'accountant';

export type ProductPermissionCapability = 'view' | 'edit' | 'delete' | 'operate';

export interface ProductPermissionAction {
  id: string;
  submodule: string;
  capability: ProductPermissionCapability;
  label: string;
  description: string;
  icon: string;
  defaultRoles: readonly Exclude<ProductPermissionRole, 'administrator'>[];
}

export interface ProductPermissionArea {
  id: string;
  name: string;
  description: string;
  icon: string;
  actions: readonly ProductPermissionAction[];
}

export interface ProductProfileRoleSource {
  role?: unknown;
  roles?: readonly unknown[] | null;
}

export const PRODUCT_ACCESS_ROLES = [
  {
    value: 'administrator',
    label: 'Administrador',
    description: 'Acesso total irrestrito a todas as áreas e ações',
    icon: 'bi-shield-shaded',
  },
  {
    value: 'manager',
    label: 'Gestor',
    description: 'Gestão operacional, estoque, relatórios e vendas',
    icon: 'bi-briefcase-fill',
  },
  {
    value: 'stockist',
    label: 'Estoquista',
    description: 'Controle, contagens e movimentações de estoque',
    icon: 'bi-boxes',
  },
  {
    value: 'seller',
    label: 'Vendedor',
    description: 'Produtos, logística e fornecedores',
    icon: 'bi-tag-fill',
  },
  {
    value: 'deliverer',
    label: 'Entregador / Montador',
    description: 'Rotas, montagens e consulta de produtos e estoque',
    icon: 'bi-truck',
  },
  {
    value: 'accountant',
    label: 'Contador',
    description: 'Acesso financeiro, relatórios fiscais e DRE',
    icon: 'bi-calculator',
  },
] as const;

export const PRODUCT_PERMISSION_AREA: ProductPermissionArea = {
  id: 'stockAndProducts',
  name: 'Produtos',
  description: 'Catálogo e seus submódulos de cadastro e integração.',
  icon: 'bi-box-seam-fill',
  actions: [
    {
      id: 'viewProducts',
      submodule: 'Cadastro de produtos',
      capability: 'view',
      label: 'Acessar catálogo',
      description: 'Consultar produtos, preços e detalhes.',
      icon: 'bi-eye-fill',
      defaultRoles: ['manager', 'seller', 'deliverer', 'stockist'],
    },
    {
      id: 'productConfig',
      submodule: 'Cadastro de produtos',
      capability: 'edit',
      label: 'Criar e editar',
      description: 'Cadastrar produtos, editar dados e variações.',
      icon: 'bi-pencil-square',
      defaultRoles: ['manager', 'stockist', 'seller'],
    },
    {
      id: 'deleteProducts',
      submodule: 'Cadastro de produtos',
      capability: 'delete',
      label: 'Excluir e desativar',
      description: 'Excluir ou inativar produtos cadastrados.',
      icon: 'bi-trash-fill',
      defaultRoles: ['manager', 'seller'],
    },
    {
      id: 'printProductIdentificationLabels',
      submodule: 'Cadastro de produtos',
      capability: 'operate',
      label: 'Imprimir etiquetas de identificação',
      description: 'Imprimir etiquetas de identificação de produtos e variações.',
      icon: 'bi-upc-scan',
      defaultRoles: ['manager', 'seller', 'stockist', 'deliverer'],
    },
    {
      id: 'viewProductCharacteristics',
      submodule: 'Características',
      capability: 'view',
      label: 'Acessar',
      description: 'Consultar e configurar características de produtos.',
      icon: 'bi-sliders2',
      defaultRoles: ['manager', 'stockist', 'seller'],
    },
    {
      id: 'viewProductCategories',
      submodule: 'Ambientes e categorias',
      capability: 'view',
      label: 'Acessar',
      description: 'Consultar e configurar ambientes, categorias e tipos.',
      icon: 'bi-tags-fill',
      defaultRoles: ['manager', 'stockist', 'seller'],
    },
    {
      id: 'viewProductCompositions',
      submodule: 'Composições',
      capability: 'view',
      label: 'Acessar',
      description: 'Consultar e configurar composições e kits.',
      icon: 'bi-diagram-3-fill',
      defaultRoles: ['manager', 'stockist', 'seller'],
    },
    {
      id: 'viewProductReconciliation',
      submodule: 'Conciliação de fornecedores',
      capability: 'view',
      label: 'Acessar',
      description: 'Consultar e executar conciliação de produtos de fornecedores.',
      icon: 'bi-arrow-left-right',
      defaultRoles: ['manager', 'stockist', 'seller'],
    },
  ],
};

export const PRODUCT_PERMISSION_ACTIONS = PRODUCT_PERMISSION_AREA.actions;
export type ProductPermissionId = (typeof PRODUCT_PERMISSION_ACTIONS)[number]['id'];

export const getProductProfileRoles = (profile?: ProductProfileRoleSource | null): string[] => {
  const roles = profile?.roles?.filter(
    (role): role is string => typeof role === 'string' && role !== 'pending'
  ) || [];
  if (roles.length > 0) return [...roles];
  return typeof profile?.role === 'string' && profile.role !== 'pending' ? [profile.role] : [];
};

export const isStockistOnlyProductProfile = (
  profile?: ProductProfileRoleSource | null
): boolean => {
  const roles = getProductProfileRoles(profile);
  return roles.length === 1 && roles[0] === 'stockist';
};

export const shouldHideProductCatalogPublicationStatus = (
  profile?: ProductProfileRoleSource | null
): boolean => {
  const roles = getProductProfileRoles(profile);
  return roles.length > 0 && roles.every((role) => role === 'stockist' || role === 'deliverer');
};

const roleAliases: Record<string, ProductPermissionRole | undefined> = {
  admin: 'administrator',
  master: 'administrator',
  gerente: 'manager',
  vendedor: 'seller',
  entregador: 'deliverer',
  driver: 'deliverer',
};

export const normalizePermissionRoles = (roles: readonly unknown[]): ProductPermissionRole[] =>
  [...new Set(roles.flatMap((role) => {
    if (typeof role !== 'string' || role === 'pending') return [];
    const normalized = roleAliases[role] || role;
    return PRODUCT_ACCESS_ROLES.some(({ value }) => value === normalized)
      ? [normalized as ProductPermissionRole]
      : [];
  }))];

export const isProductIdentificationLabelOnlyProfile = (roles: readonly unknown[]): boolean => {
  const normalizedRoles = normalizePermissionRoles(roles);
  const labelOnlyRoles = new Set<ProductPermissionRole>(['seller', 'stockist', 'deliverer']);
  return normalizedRoles.length > 0 && normalizedRoles.every((role) => labelOnlyRoles.has(role));
};

export const hasProductPermission = (
  actionId: string,
  roles: readonly unknown[],
  rolePermissions?: Record<string, readonly string[] | undefined>
): boolean => {
  const action = PRODUCT_PERMISSION_ACTIONS.find((permission) => permission.id === actionId);
  if (!action) return false;

  const normalizedRoles = normalizePermissionRoles(roles);
  if (normalizedRoles.length === 0) return false;
  if (normalizedRoles.includes('administrator')) return true;

  const configuredRoles = rolePermissions?.[actionId];
  const allowedRoles = configuredRoles ?? action.defaultRoles;
  return allowedRoles.some((role) => normalizedRoles.includes(role as ProductPermissionRole));
};
