import {
  hasRolePermission,
  normalizePermissionRoles,
  PRODUCT_PERMISSION_ACTIONS,
  type ProductPermissionRole,
} from './productPermissions';

export interface AgentPermissionContext {
  userId?: string;
  role?: unknown;
  roles?: readonly unknown[] | null;
  rolePermissions?: Record<string, readonly string[] | undefined>;
  enforced?: boolean;
}

export interface AgentPermissionCheckResult {
  allowed: boolean;
  requiredActions: string[];
  code?: string;
  error?: string;
}

const DEFAULT_ACTION_ROLES: Record<string, readonly Exclude<ProductPermissionRole, 'administrator'>[]> = {
  // Vendas & Operações
  viewOrders: ['manager'],
  createEditOrders: ['manager'],
  deleteOrders: ['manager'],
  viewBudgets: ['manager'],
  viewAssistanceOrders: ['manager'],
  viewReturns: ['manager'],
  viewSalesReports: ['manager'],
  exportSalesReports: ['manager'],
  // Produtos
  ...Object.fromEntries(PRODUCT_PERMISSION_ACTIONS.map((a) => [a.id, a.defaultRoles])),
  viewProductCost: ['manager'],
  // Estoque
  viewStock: ['manager', 'deliverer', 'stockist'],
  viewStockMovements: ['manager', 'deliverer', 'stockist'],
  manualStockMovement: ['manager', 'stockist'],
  viewStockInventory: ['manager', 'deliverer', 'stockist'],
  finalizeStockInventory: ['manager', 'stockist'],
  viewSuppliers: ['manager', 'seller', 'stockist'],
  // Logística
  viewDeliverySchedule: ['manager', 'seller', 'deliverer'],
  startDelivery: ['manager', 'deliverer', 'seller', 'stockist'],
  viewAssemblyList: ['manager', 'seller', 'deliverer'],
  // Pessoas
  viewPeople: ['manager'],
  viewCustomers: ['manager'],
  createEditPeople: ['manager'],
  deletePeople: ['manager'],
  viewEmployees: ['manager'],
  // Financeiro (por padrão restrito ao administrador, salvo configuração explícita em rolePermissions)
  viewFinancials: [],
  viewFinanceTransactions: [],
  viewFinancePayables: [],
  viewFinanceReceivables: [],
  viewFinanceSettings: [],
  exportReports: [],
  // Configurações
  manageAccess: ['manager'],
  manageSettings: [],
};

const ACTION_LABELS: Record<string, string> = {
  viewOrders: 'Visualizar Pedidos de Venda',
  createEditOrders: 'Criar e Editar Pedidos / Operações Comerciais',
  deleteOrders: 'Excluir ou Cancelar Pedidos',
  viewBudgets: 'Acessar Orçamentos',
  viewAssistanceOrders: 'Acessar Ordens de Assistência',
  viewReturns: 'Acessar Devoluções',
  viewDeliverySchedule: 'Acessar Agenda de Entregas',
  startDelivery: 'Operar Entregas e Rotas',
  viewAssemblyList: 'Acessar Lista de Montagem',
  viewProducts: 'Acessar Catálogo de Produtos',
  viewProductCost: 'Visualizar Preço de Custo de Produtos',
  productConfig: 'Criar e Editar Produtos',
  deleteProducts: 'Excluir ou Desativar Produtos',
  viewProductCharacteristics: 'Acessar Características de Produtos',
  viewProductCategories: 'Acessar Categorias de Produtos',
  viewStock: 'Acessar Estoque',
  manualStockMovement: 'Registrar Movimentações de Estoque',
  viewPeople: 'Acessar Cadastros de Pessoas',
  viewCustomers: 'Consultar Clientes',
  createEditPeople: 'Criar e Editar Clientes/Pessoas',
  viewEmployees: 'Consultar Colaboradores',
  viewFinancials: 'Acessar Módulo Financeiro',
  viewFinanceTransactions: 'Acessar e Operar Transações Financeiras',
  viewFinancePayables: 'Acessar e Operar Contas a Pagar',
  viewFinanceReceivables: 'Acessar e Operar Contas a Receber',
};

let activePermissionContext: AgentPermissionContext | null = null;
let cachedRuntimeContext: {
  userId: string;
  context: AgentPermissionContext;
  expiresAt: number;
} | null = null;

export const setActiveAgentPermissionContext = (context: AgentPermissionContext | null): void => {
  activePermissionContext = context;
};

export const clearCachedRuntimeAgentPermissionContext = (): void => {
  cachedRuntimeContext = null;
  activePermissionContext = null;
};

export const getActiveAgentPermissionContext = (): AgentPermissionContext | null =>
  activePermissionContext;

export const extractNormalizedRoles = (
  context?: AgentPermissionContext | null
): ProductPermissionRole[] => {
  if (!context) return [];
  const rawRoles =
    Array.isArray(context.roles) && context.roles.length > 0
      ? context.roles
      : context.role !== undefined && context.role !== null
        ? [context.role]
        : [];
  return normalizePermissionRoles(rawRoles);
};

export const isPermissionContextEnforced = (
  context?: AgentPermissionContext | null
): boolean => {
  const effective = context ?? activePermissionContext;
  if (!effective) return false;
  return effective.enforced !== false;
};

export const canAgentViewProductCost = (
  context?: AgentPermissionContext | null
): boolean => {
  const effectiveContext = context ?? activePermissionContext;
  if (!effectiveContext) return false;
  if (effectiveContext.enforced === false) return true;
  return hasAgentActionPermission('viewProductCost', effectiveContext);
};

export const hasAgentActionPermission = (
  actionId: string,
  context?: AgentPermissionContext | null
): boolean => {
  const effective = context ?? activePermissionContext;
  if (!effective) return false;
  if (effective.enforced === false) return true;
  const roles = extractNormalizedRoles(effective);
  if (roles.length === 0) return false;
  if (roles.includes('administrator')) return true;
  if (actionId === 'manageSettings') return false;

  const defaultRoles = DEFAULT_ACTION_ROLES[actionId] ?? [];
  return hasRolePermission(actionId, roles, defaultRoles, effective?.rolePermissions);
};

export const resolveRequiredActionsForTool = (
  toolName: string,
  args: Record<string, any> = {}
): string[] => {
  switch (toolName) {
    case 'registrarFeedbackAgente':
      return [];

    // Financeiro
    case 'buscarCategoriasFinanceiras':
    case 'buscarMovimentacoesFinanceiras':
    case 'obterResumoFinanceiro':
    case 'criarMovimentacaoFinanceira':
    case 'editarMovimentacaoFinanceira':
    case 'cancelarOuExcluirMovimentacaoFinanceira':
      return ['viewFinanceTransactions', 'viewFinancials'];

    case 'buscarContasAPagar':
    case 'criarContaAPagar':
    case 'editarContaAPagar':
      return ['viewFinancePayables', 'viewFinancials'];

    case 'buscarContasAReceber':
    case 'criarContaAReceber':
    case 'editarContaAReceber':
      return ['viewFinanceReceivables', 'viewFinancials'];

    case 'baixarContaFinanceira':
      return args?.tipoConta === 'receivable'
        ? ['viewFinanceReceivables', 'viewFinancials']
        : ['viewFinancePayables', 'viewFinancials'];

    // Pedidos, Orçamentos, Assistências, Devoluções e Entregas
    case 'buscarPedidosEntregas':
    case 'obterDetalhesPedidoEntrega':
      return ['viewDeliverySchedule', 'startDelivery', 'viewOrders', 'createEditOrders'];

    case 'buscarOperacoes': {
      const tipo = String(args?.tipo || 'todas').toLowerCase();
      if (tipo === 'venda') return ['viewOrders', 'createEditOrders'];
      if (tipo === 'orcamento') return ['viewBudgets', 'createEditOrders'];
      if (tipo === 'assistencia') return ['viewAssistanceOrders', 'createEditOrders'];
      if (tipo === 'devolucao') return ['viewReturns', 'createEditOrders'];
      if (tipo === 'entrega' || tipo === 'retirada') {
        return ['viewDeliverySchedule', 'startDelivery', 'viewOrders', 'createEditOrders'];
      }
      if (tipo === 'montagem') {
        return ['viewAssemblyList', 'viewDeliverySchedule', 'viewOrders', 'createEditOrders'];
      }
      return ['viewOrders', 'createEditOrders'];
    }

    case 'obterDetalhesOperacao':
      return [
        'viewOrders',
        'createEditOrders',
        'viewBudgets',
        'viewAssistanceOrders',
        'viewReturns',
      ];

    case 'criarPedidoOperacao': {
      const tipo = String(args?.tipoOperacao || 'venda').toLowerCase();
      if (tipo === 'orcamento') return ['createEditOrders', 'viewBudgets'];
      if (tipo === 'assistencia') return ['createEditOrders', 'viewAssistanceOrders'];
      if (tipo === 'devolucao') return ['createEditOrders', 'viewReturns'];
      return ['createEditOrders'];
    }

    case 'editarPedidoOperacao': {
      const status = String(args?.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'cancelado' || args?.excluir === true) {
        return ['deleteOrders', 'createEditOrders'];
      }
      const tipo = String(args?.tipoOperacao || '').toLowerCase();
      if (tipo === 'orcamento') return ['createEditOrders', 'viewBudgets'];
      if (tipo === 'assistencia') return ['createEditOrders', 'viewAssistanceOrders'];
      if (tipo === 'devolucao') return ['createEditOrders', 'viewReturns'];
      return ['createEditOrders'];
    }

    // Produtos e Estoque
    case 'buscarProdutos':
    case 'obterDetalhesProduto':
      return ['viewProducts', 'productConfig', 'viewStock'];

    case 'listarCategoriasECaracteristicasProduto':
      return [
        'viewProducts',
        'productConfig',
        'viewProductCategories',
        'viewProductCharacteristics',
      ];

    case 'criarProduto':
      return ['productConfig'];

    case 'editarProduto': {
      if (args?.moverParaLixeira === true || args?.ativo === false) {
        return ['deleteProducts', 'productConfig'];
      }
      const providedKeys = Object.keys(args || {}).filter(
        (key) => key !== 'codigoOuSku' && args[key] !== undefined
      );
      const isStockOnlyEdit =
        providedKeys.length > 0 &&
        providedKeys.every((key) => ['estoque', 'estoqueMinimo', 'unidade'].includes(key));
      if (isStockOnlyEdit) {
        return ['productConfig', 'manualStockMovement'];
      }
      return ['productConfig'];
    }

    // Pessoas (Clientes e Colaboradores)
    case 'buscarClientes':
      return ['viewCustomers', 'viewPeople', 'createEditPeople', 'viewOrders', 'createEditOrders'];

    case 'criarOuEditarCliente':
      return ['createEditPeople', 'createEditOrders'];

    case 'buscarColaboradores':
      return ['viewEmployees', 'viewPeople', 'manageAccess', 'viewOrders', 'createEditOrders'];

    default:
      return [];
  }
};

export const checkAgentToolPermission = (
  toolName: string,
  args: Record<string, any> | undefined,
  context?: AgentPermissionContext | null
): AgentPermissionCheckResult => {
  if (toolName === 'registrarFeedbackAgente') {
    return { allowed: true, requiredActions: [] };
  }

  const effectiveContext = context ?? activePermissionContext;
  if (!isPermissionContextEnforced(effectiveContext)) {
    return { allowed: true, requiredActions: [] };
  }

  const roles = extractNormalizedRoles(effectiveContext);
  if (roles.length === 0) {
    return {
      allowed: false,
      requiredActions: [],
      code: 'PERMISSION_DENIED',
      error: 'Seu usuário não possui um perfil de acesso ativo ou atribuído no sistema.',
    };
  }

  const requiredActions = resolveRequiredActionsForTool(toolName, args || {});
  if (requiredActions.length === 0) {
    return { allowed: true, requiredActions: [] };
  }

  const hasAnyRequired = requiredActions.some((actionId) =>
    hasAgentActionPermission(actionId, effectiveContext)
  );
  if (hasAnyRequired) {
    return { allowed: true, requiredActions };
  }

  const labels = requiredActions.map((id) => ACTION_LABELS[id] || id);
  return {
    allowed: false,
    requiredActions,
    code: 'PERMISSION_DENIED',
    error: `Seu perfil de acesso atual não possui permissão para executar esta ação (${labels.join(' ou ')}). Solicite a liberação ao administrador caso precise deste acesso.`,
  };
};

export const isAgentToolPermitted = (
  toolName: string,
  context?: AgentPermissionContext | null
): boolean => {
  if (toolName === 'registrarFeedbackAgente') return true;
  const effectiveContext = context ?? activePermissionContext;
  if (!isPermissionContextEnforced(effectiveContext)) return true;
  const roles = extractNormalizedRoles(effectiveContext);
  if (roles.length === 0) return false;
  if (roles.includes('administrator')) return true;

  const requiredActions = resolveRequiredActionsForTool(toolName, {});
  if (requiredActions.length === 0) return true;
  return requiredActions.some((actionId) =>
    hasAgentActionPermission(actionId, effectiveContext)
  );
};

export const filterAgentToolsByPermission = <T extends { name: string }>(
  tools: Array<{ functionDeclarations: T[] }>,
  context?: AgentPermissionContext | null
): Array<{ functionDeclarations: T[] }> => {
  return tools
    .map((toolGroup) => ({
      ...toolGroup,
      functionDeclarations: toolGroup.functionDeclarations.filter((decl) =>
        isAgentToolPermitted(decl.name, context)
      ),
    }))
    .filter((toolGroup) => toolGroup.functionDeclarations.length > 0);
};

export const resolveRuntimeAgentPermissionContext = async (
  supabaseClient?: any,
  explicitContext?: AgentPermissionContext | null
): Promise<AgentPermissionContext | null> => {
  if (explicitContext && isPermissionContextEnforced(explicitContext)) {
    return explicitContext;
  }
  if (activePermissionContext && isPermissionContextEnforced(activePermissionContext)) {
    return activePermissionContext;
  }
  if (!supabaseClient?.auth || typeof supabaseClient.auth.getSession !== 'function') {
    return null;
  }

  try {
    const sessionRes = await supabaseClient.auth.getSession();
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return null;

    if (
      cachedRuntimeContext &&
      cachedRuntimeContext.userId === userId &&
      Date.now() < cachedRuntimeContext.expiresAt
    ) {
      return cachedRuntimeContext.context;
    }

    const [profileRes, settingsRes] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('role, roles')
        .eq('id', userId)
        .maybeSingle(),
      supabaseClient
        .from('settings')
        .select('rolePermissions:data->rolePermissions')
        .eq('id', 'app')
        .maybeSingle(),
    ]);

    const profile = profileRes?.data;
    const context: AgentPermissionContext = {
      role: profile?.role,
      roles: Array.isArray(profile?.roles) ? profile.roles : undefined,
      rolePermissions:
        settingsRes?.data?.rolePermissions &&
        typeof settingsRes.data.rolePermissions === 'object'
          ? settingsRes.data.rolePermissions
          : undefined,
      enforced: true,
    };

    cachedRuntimeContext = {
      userId,
      context,
      expiresAt: Date.now() + 60_000,
    };
    return context;
  } catch {
    return null;
  }
};

export const describeOperatorPermissionsForPrompt = (
  context?: AgentPermissionContext | null
): string => {
  const effective = context ?? activePermissionContext;
  if (!isPermissionContextEnforced(effective)) {
    return '';
  }
  const roles = extractNormalizedRoles(effective);
  if (roles.includes('administrator')) {
    return '\nPERFIL DE ACESSO DO OPERADOR ATUAL: Administrador (acesso total liberado para Financeiro, Pedidos/Orçamentos/Assistências/Devoluções, Produtos/Estoque e Pessoas).';
  }
  const allowedAreas: string[] = [];
  const restrictedAreas: string[] = [];

  const checkGroup = (label: string, actions: string[]) => {
    if (actions.some((a) => hasAgentActionPermission(a, effective))) {
      allowedAreas.push(label);
    } else {
      restrictedAreas.push(label);
    }
  };

  checkGroup('Financeiro (consulta e lançamentos)', [
    'viewFinancials',
    'viewFinanceTransactions',
    'viewFinancePayables',
    'viewFinanceReceivables',
  ]);
  checkGroup('Pedidos de Venda (consulta)', ['viewOrders', 'createEditOrders']);
  checkGroup('Pedidos/Orçamentos/Assistências/Devoluções (criação e edição)', ['createEditOrders']);
  checkGroup('Orçamentos (consulta)', ['viewBudgets', 'viewOrders', 'createEditOrders']);
  checkGroup('Assistências (consulta)', ['viewAssistanceOrders', 'viewOrders', 'createEditOrders']);
  checkGroup('Devoluções (consulta)', ['viewReturns', 'viewOrders', 'createEditOrders']);
  checkGroup('Produtos (consulta)', ['viewProducts', 'productConfig', 'viewStock']);
  checkGroup('Preço de custo de produtos (consulta)', ['viewProductCost']);
  checkGroup('Produtos (criação e edição de cadastro/preços/variações)', ['productConfig']);
  checkGroup('Estoque (ajuste de saldo)', ['productConfig', 'manualStockMovement']);
  checkGroup('Clientes (consulta)', ['viewCustomers', 'viewPeople', 'createEditPeople', 'viewOrders']);
  checkGroup('Clientes (criação e edição)', ['createEditPeople', 'createEditOrders']);

  return `\nPERFIL DE ACESSO DO OPERADOR ATUAL (${roles.join(', ') || 'sem perfil'}):
- Áreas/ações PERMITIDAS para este operador: ${allowedAreas.join('; ') || 'Nenhuma'}.
- Áreas/ações SEM PERMISSÃO para este operador: ${restrictedAreas.join('; ') || 'Nenhuma'}.
Se o operador pedir uma consulta ou ação em área sem permissão (ou se a ferramenta retornar PERMISSION_DENIED), explique educadamente que o perfil de acesso atual dele não possui permissão para essa operação.`;
};
