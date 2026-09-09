export type OperationActivityType = 'delivery' | 'assistance' | 'return';

export interface OperationActivityPresentation {
  type: OperationActivityType;
  label: 'ENTREGA' | 'ASSISTÊNCIA' | 'DEVOLUÇÃO';
  color: string;
  backgroundColor: string;
}

/** Fonte única dos rótulos e cores operacionais usados pela Agenda e Operação. */
export const OPERATION_ACTIVITY_PRESENTATION: Record<OperationActivityType, OperationActivityPresentation> = {
  delivery: { type: 'delivery', label: 'ENTREGA', color: '#2563eb', backgroundColor: '#dbeafe' },
  assistance: { type: 'assistance', label: 'ASSISTÊNCIA', color: '#ea580c', backgroundColor: '#ffedd5' },
  return: { type: 'return', label: 'DEVOLUÇÃO', color: '#d97706', backgroundColor: '#fef3c7' },
};

export function getOperationActivityType(order: any): OperationActivityType {
  const data = order?.order_data || order || {};
  const rawType = String(
    data.orderType || data.order_type || order?.orderType || order?.order_type || data.type || ''
  ).toLowerCase();

  if (rawType === 'return' || rawType === 'devolucao' || rawType === 'devolução') return 'return';
  if (rawType === 'assistance' || rawType === 'assistencia' || rawType === 'assistência') return 'assistance';
  return 'delivery';
}

export function getOperationActivityPresentation(order: any): OperationActivityPresentation {
  return OPERATION_ACTIVITY_PRESENTATION[getOperationActivityType(order)];
}
