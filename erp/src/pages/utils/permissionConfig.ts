import type { UserRole } from '@/context/AuthContext';

export interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: string;
}

export const ROLES: RoleOption[] = [
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
];

export type PermissionCapability = 'view' | 'edit' | 'delete' | 'operate' | 'export';

export interface PermissionActionDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  defaultRoles: UserRole[];
  submodule: string;
  capability: PermissionCapability;
}

export interface PermissionAreaDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  actions: PermissionActionDef[];
}

const action = (
  id: string,
  submodule: string,
  capability: PermissionCapability,
  label: string,
  description: string,
  icon: string,
  defaultRoles: UserRole[]
): PermissionActionDef => ({
  id,
  submodule,
  capability,
  label,
  description,
  icon,
  defaultRoles,
});

const managers: UserRole[] = ['manager'];
const productManagers: UserRole[] = ['manager', 'stockist', 'seller'];
const productViewers: UserRole[] = ['manager', 'seller', 'deliverer', 'stockist'];
const stockViewers: UserRole[] = ['manager', 'deliverer', 'stockist'];
const stockManagers: UserRole[] = ['manager', 'stockist'];
const fiscalModuleViewers: UserRole[] = ['administrator', 'manager', 'accountant', 'seller', 'stockist'];
const financeAdministrators: UserRole[] = ['administrator'];
const logisticsViewers: UserRole[] = ['manager', 'seller', 'deliverer'];

export const FINANCE_ADMIN_ONLY_ACTIONS = [
  'viewFinancials',
  'viewFinanceTransactions',
  'viewFinancePayables',
  'viewFinanceReceivables',
  'viewFinanceSettings',
  'exportReports',
] as const;

export const isFinanceAdminOnlyAction = (actionId: string): boolean =>
  (FINANCE_ADMIN_ONLY_ACTIONS as readonly string[]).includes(actionId);

export const canUseFinanceModule = (roles: UserRole[]): boolean => roles.includes('administrator');

export const canSeeFinanceModuleBeta = (roles: UserRole[]): boolean =>
  !canUseFinanceModule(roles) && roles.some((role) => role === 'manager' || role === 'accountant');

export const PERMISSION_AREAS: PermissionAreaDef[] = [
  {
    id: 'salesOrders',
    name: 'Vendas',
    description: 'Pedidos, orçamentos, assistência, devoluções e relatórios de venda.',
    icon: 'bi-bag-check-fill',
    actions: [
      action('viewOrders', 'Pedidos de venda', 'view', 'Acessar', 'Consultar pedidos e detalhes das vendas.', 'bi-eye-fill', managers),
      action('createEditOrders', 'Pedidos de venda', 'edit', 'Criar e editar', 'Cadastrar pedidos e alterar itens, preços ou descontos.', 'bi-pencil-square', managers),
      action('deleteOrders', 'Pedidos de venda', 'delete', 'Excluir e cancelar', 'Excluir ou cancelar pedidos conforme as regras comerciais.', 'bi-trash3-fill', managers),
      action('viewBudgets', 'Orçamentos', 'view', 'Acessar', 'Consultar orçamentos e propostas.', 'bi-file-earmark-text', managers),
      action('viewAssistanceOrders', 'Ordens de assistência', 'view', 'Acessar', 'Consultar ordens de assistência.', 'bi-tools', managers),
      action('viewReturns', 'Devoluções', 'view', 'Acessar', 'Consultar devoluções vinculadas às vendas.', 'bi-arrow-return-left', managers),
      action('viewSalesReports', 'Relatórios de vendas', 'view', 'Acessar', 'Consultar relatórios e análises de vendas.', 'bi-bar-chart-line', managers),
      action('exportSalesReports', 'Relatórios de vendas', 'export', 'Exportar', 'Baixar relatórios de vendas.', 'bi-download', managers),
    ],
  },
  {
    id: 'stockAndProducts',
    name: 'Produtos',
    description: 'Catálogo e seus submódulos de cadastro e integração.',
    icon: 'bi-box-seam-fill',
    actions: [
      action('viewProducts', 'Cadastro de produtos', 'view', 'Acessar catálogo', 'Consultar produtos, preços e detalhes.', 'bi-eye-fill', productViewers),
      action('productConfig', 'Cadastro de produtos', 'edit', 'Criar e editar', 'Cadastrar produtos, editar dados e variações.', 'bi-pencil-square', productManagers),
      action('deleteProducts', 'Cadastro de produtos', 'delete', 'Excluir e desativar', 'Excluir ou inativar produtos cadastrados.', 'bi-trash-fill', ['manager', 'seller']),
      action('printProductIdentificationLabels', 'Cadastro de produtos', 'operate', 'Imprimir etiquetas de identificação', 'Imprimir etiquetas de identificação de produtos e variações.', 'bi-upc-scan', ['manager', 'seller', 'stockist', 'deliverer']),
      action('viewProductCharacteristics', 'Características', 'view', 'Acessar', 'Consultar e configurar características de produtos.', 'bi-sliders2', ['manager', 'stockist', 'seller']),
      action('viewProductCategories', 'Ambientes e categorias', 'view', 'Acessar', 'Consultar e configurar ambientes, categorias e tipos.', 'bi-tags-fill', ['manager', 'stockist', 'seller']),
      action('viewProductCompositions', 'Composições', 'view', 'Acessar', 'Consultar e configurar composições e kits.', 'bi-diagram-3-fill', ['manager', 'stockist', 'seller']),
      action('viewProductReconciliation', 'Conciliação de fornecedores', 'view', 'Acessar', 'Consultar e executar conciliação de produtos de fornecedores.', 'bi-arrow-left-right', ['manager', 'stockist', 'seller']),
    ],
  },
  {
    id: 'stock',
    name: 'Estoque',
    description: 'Operação, compras, recebimentos, etiquetas e fornecedores.',
    icon: 'bi-boxes',
    actions: [
      action('viewStock', 'Acesso ao módulo', 'view', 'Acessar módulo', 'Abrir a área operacional de estoque.', 'bi-boxes', stockViewers),
      action('viewStockMovements', 'Movimentações', 'view', 'Acessar', 'Consultar entradas, saídas e histórico de estoque.', 'bi-arrow-left-right', stockViewers),
      action('manualStockMovement', 'Movimentações', 'edit', 'Registrar movimentações', 'Registrar entradas e saídas manuais de estoque.', 'bi-pencil-square', stockManagers),
      action('viewStockInventory', 'Inventários', 'view', 'Acessar', 'Consultar contagens e sessões de inventário.', 'bi-journal-check', stockViewers),
      action('viewStockUnavailabilities', 'Indisponibilidades', 'view', 'Acessar', 'Consultar perdas, avarias e indisponibilidades.', 'bi-dash-circle-dotted', stockViewers),
      action('viewStockPurchases', 'Pedidos de compra', 'view', 'Acessar', 'Consultar pedidos de compra.', 'bi-cart-fill', stockViewers),
      action('viewStockReceipts', 'Recebimentos', 'view', 'Acessar', 'Consultar conferências e recebimentos de mercadoria.', 'bi-clipboard-check', stockViewers),
      action('viewStockLabels', 'Etiquetas', 'view', 'Acessar', 'Consultar e imprimir etiquetas de produtos e preços.', 'bi-upc-scan', stockViewers),
      action('viewBlingStock', 'Estoque Bling', 'view', 'Acessar', 'Consultar estoque sincronizado com o Bling.', 'bi-cloud-arrow-down', ['manager', 'deliverer']),
      action('viewSuppliers', 'Fornecedores', 'view', 'Acessar', 'Consultar o submódulo de fornecedores do estoque.', 'bi-truck', ['manager', 'seller', 'stockist']),
    ],
  },
  {
    id: 'logistics',
    name: 'Logística',
    description: 'Agendas de entrega, rotas e listas de montagem.',
    icon: 'bi-truck',
    actions: [
      action('viewDeliverySchedule', 'Agenda de entregas', 'view', 'Acessar', 'Consultar agenda e pedidos programados para entrega.', 'bi-calendar-event', logisticsViewers),
      action('startDelivery', 'Agenda de entregas', 'operate', 'Iniciar e atualizar rota', 'Despachar pedidos e atualizar o andamento da entrega.', 'bi-truck', ['manager', 'deliverer']),
      action('viewAssemblyList', 'Lista de montagem', 'view', 'Acessar', 'Consultar itens e serviços de montagem.', 'bi-tools', logisticsViewers),
    ],
  },
  {
    id: 'registrations',
    name: 'Pessoas e cadastros',
    description: 'Clientes, colaboradores, serviços e necessidades de clientes.',
    icon: 'bi-people-fill',
    actions: [
      action('viewPeople', 'Acesso ao módulo', 'view', 'Acessar módulo', 'Abrir a área de cadastros de pessoas.', 'bi-eye-fill', managers),
      action('viewCustomers', 'Clientes', 'view', 'Acessar', 'Consultar clientes e seus dados cadastrais.', 'bi-person-lines-fill', managers),
      action('createEditPeople', 'Clientes', 'edit', 'Criar e editar', 'Cadastrar e atualizar clientes e cadastros de pessoas.', 'bi-person-plus-fill', managers),
      action('deletePeople', 'Clientes', 'delete', 'Excluir e inativar', 'Excluir ou inativar cadastros de pessoas.', 'bi-person-x-fill', managers),
      action('viewEmployees', 'Colaboradores', 'view', 'Acessar', 'Consultar colaboradores e seus perfis.', 'bi-person-badge-fill', managers),
      action('viewServices', 'Serviços', 'view', 'Acessar', 'Consultar serviços cadastrados.', 'bi-tools', managers),
      action('viewCustomerDesires', 'Necessidades de clientes', 'view', 'Acessar', 'Consultar preferências e necessidades registradas por clientes.', 'bi-heart', managers),
    ],
  },
  {
    id: 'fiscal',
    name: 'Fiscal',
    description: 'Documentos fiscais, documentos de entrada e catálogo NCM.',
    icon: 'bi-receipt-cutoff',
    actions: [
      action('viewFiscal', 'Notas fiscais de saída', 'view', 'Acessar', 'Consultar documentos fiscais de saída.', 'bi-receipt', fiscalModuleViewers),
      action('viewInboundFiscal', 'Notas fiscais de entrada', 'view', 'Acessar', 'Consultar documentos fiscais de entrada.', 'bi-file-earmark-arrow-down', fiscalModuleViewers),
      action('viewNcmCatalog', 'Catálogo NCM', 'view', 'Acessar', 'Consultar códigos e classificações NCM.', 'bi-list-check', fiscalModuleViewers),
    ],
  },
  {
    id: 'financials',
    name: 'Financeiro e relatórios',
    description: 'Movimentações financeiras, indicadores e exportações.',
    icon: 'bi-currency-dollar',
    actions: [
      action('viewFinanceTransactions', 'Transações', 'view', 'Acessar', 'Consultar movimentações e lançamentos financeiros.', 'bi-arrow-left-right', financeAdministrators),
      action('viewFinancePayables', 'Contas a pagar', 'view', 'Acessar', 'Consultar contas e compromissos a pagar.', 'bi-box-arrow-up-right', financeAdministrators),
      action('viewFinanceReceivables', 'Contas a receber', 'view', 'Acessar', 'Consultar contas e recebimentos pendentes.', 'bi-box-arrow-in-down-left', financeAdministrators),
      action('viewFinancials', 'Acesso ao módulo', 'view', 'Acessar módulo', 'Abrir a área financeira.', 'bi-graph-up-arrow', financeAdministrators),
      action('exportReports', 'Relatórios financeiros', 'export', 'Exportar relatórios', 'Baixar relatórios financeiros em PDF, Excel ou CSV.', 'bi-file-earmark-spreadsheet-fill', financeAdministrators),
      action('viewFinanceSettings', 'Configurações financeiras', 'view', 'Acessar', 'Consultar configurações do módulo financeiro.', 'bi-gear', financeAdministrators),
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Publicações, catálogos e canais de divulgação.',
    icon: 'bi-megaphone-fill',
    actions: [
      action('viewMarketing', 'Acesso ao módulo', 'view', 'Acessar módulo', 'Abrir a área de marketing.', 'bi-instagram', managers),
      action('viewMarketingPosts', 'Publicações', 'view', 'Acessar publicações', 'Consultar publicações e gerador de conteúdo.', 'bi-card-text', managers),
      action('viewChannelCatalog', 'Catálogo de canais', 'view', 'Acessar', 'Consultar catálogos conectados aos canais de venda.', 'bi-grid-3x3-gap', managers),
      action('viewMetaCatalog', 'Catálogo Meta', 'view', 'Acessar', 'Consultar o catálogo de produtos para a Meta.', 'bi-meta', managers),
      action('viewWhatsAppMarketplace', 'Marketplace WhatsApp', 'view', 'Acessar', 'Consultar catálogo e integração do WhatsApp.', 'bi-whatsapp', managers),
    ],
  },
  {
    id: 'settingsAndAccess',
    name: 'Configurações e acessos',
    description: 'Gestão de usuários, perfis e parâmetros do ERP.',
    icon: 'bi-shield-gear',
    actions: [
      action('manageAccess', 'Perfis e usuários', 'edit', 'Gerenciar colaboradores e perfis', 'Cadastrar colaboradores e alterar perfis de acesso.', 'bi-person-badge-fill', managers),
      action('manageSettings', 'Configurações gerais', 'edit', 'Alterar configurações gerais', 'Alterar preferências, regras e parâmetros do sistema.', 'bi-sliders2', []),
    ],
  },
];

export const PERMISSION_ACTIONS = PERMISSION_AREAS.flatMap((area) => area.actions);

export const findPermissionAction = (actionId: string): PermissionActionDef | undefined =>
  PERMISSION_ACTIONS.find((actionDefinition) => actionDefinition.id === actionId);
