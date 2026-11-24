import {
  hasAgentActionPermission,
  isPermissionContextEnforced,
  type AgentPermissionContext,
} from './agentPermissionGuard';

export type AgentOperationSearchType =
  | 'todas'
  | 'venda'
  | 'orcamento'
  | 'entrega'
  | 'retirada'
  | 'assistencia'
  | 'devolucao'
  | 'montagem';

const hasAny = (context: AgentPermissionContext, actions: string[]): boolean =>
  actions.some((action) => hasAgentActionPermission(action, context));

export const canAgentSearchOperationType = (
  type: AgentOperationSearchType,
  context?: AgentPermissionContext | null
): boolean => {
  if (!isPermissionContextEnforced(context)) return true;
  const effective = context!;
  switch (type) {
    case 'venda':
      return hasAny(effective, ['viewOrders', 'createEditOrders']);
    case 'orcamento':
      return hasAny(effective, ['viewBudgets', 'createEditOrders']);
    case 'assistencia':
      return hasAny(effective, ['viewAssistanceOrders', 'createEditOrders']);
    case 'devolucao':
      return hasAny(effective, ['viewReturns', 'createEditOrders']);
    case 'entrega':
    case 'retirada':
      return hasAny(effective, [
        'viewDeliverySchedule',
        'startDelivery',
        'viewOrders',
        'createEditOrders',
      ]);
    case 'montagem':
      return hasAny(effective, [
        'viewAssemblyList',
        'viewDeliverySchedule',
        'viewOrders',
        'createEditOrders',
      ]);
    case 'todas':
      return [
        'venda',
        'orcamento',
        'assistencia',
        'devolucao',
        'entrega',
        'retirada',
        'montagem',
      ].some((kind) => canAgentSearchOperationType(kind as AgentOperationSearchType, effective));
    default:
      return false;
  }
};

/** Resolve a broad request into only the database filters the current profile may read. */
export const getAgentOperationSearchTypes = (
  requested: AgentOperationSearchType,
  context?: AgentPermissionContext | null
): AgentOperationSearchType[] => {
  if (!isPermissionContextEnforced(context)) return [requested];
  if (requested !== 'todas') {
    return canAgentSearchOperationType(requested, context) ? [requested] : [];
  }

  const coreTypes: AgentOperationSearchType[] = [
    'venda',
    'orcamento',
    'assistencia',
    'devolucao',
  ];
  const allowedCoreTypes = coreTypes.filter((kind) =>
    canAgentSearchOperationType(kind, context)
  );
  if (allowedCoreTypes.length === coreTypes.length) return ['todas'];

  // A sales permission already includes the operator's sales orders, including
  // their delivery/pickup/assembly metadata. Logistics-only profiles use the
  // narrower filters and are rechecked against each returned row below.
  if (!allowedCoreTypes.includes('venda')) {
    if (canAgentSearchOperationType('entrega', context)) {
      allowedCoreTypes.push('entrega', 'retirada');
    }
    if (canAgentSearchOperationType('montagem', context)) {
      allowedCoreTypes.push('montagem');
    }
  }
  return allowedCoreTypes;
};

export const canAgentViewOperationRow = (
  kind: string,
  context?: AgentPermissionContext | null,
  options: { logisticsFilter?: 'entrega' | 'retirada' | 'montagem'; deliveryMethod?: string | null } = {}
): boolean => {
  if (!isPermissionContextEnforced(context)) return true;
  const normalizedKind = kind.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const effective = context!;
  if (['budget', 'orcamento'].includes(normalizedKind)) {
    return hasAny(effective, ['viewBudgets', 'createEditOrders']);
  }
  if (['assistance', 'assistencia'].includes(normalizedKind)) {
    return hasAny(effective, ['viewAssistanceOrders', 'createEditOrders']);
  }
  if (['return', 'devolucao'].includes(normalizedKind)) {
    return hasAny(effective, ['viewReturns', 'createEditOrders']);
  }
  if (['sale', 'venda'].includes(normalizedKind)) {
    if (hasAny(effective, ['viewOrders', 'createEditOrders'])) return true;
    if (options.logisticsFilter === 'entrega') {
      const method = String(options.deliveryMethod || '').toLowerCase();
      return Boolean(method) && !/pickup|retirada/.test(method) && hasAny(effective, ['viewDeliverySchedule', 'startDelivery']);
    }
    if (options.logisticsFilter === 'retirada') {
      const method = String(options.deliveryMethod || '').toLowerCase();
      return /pickup|retirada/.test(method) && hasAny(effective, ['viewDeliverySchedule', 'startDelivery']);
    }
    if (options.logisticsFilter === 'montagem') {
      return hasAny(effective, ['viewAssemblyList', 'viewDeliverySchedule']);
    }
  }
  return false;
};
