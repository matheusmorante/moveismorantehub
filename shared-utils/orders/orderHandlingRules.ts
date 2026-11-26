const ASSEMBLY_RESPONSIBLE_HANDLINGS = new Set([
  'De mostruário > Desmontagem do mostruário > Montagem na entrega',
  'Na caixa > Montagem no local da entrega',
]);

export const requiresAssemblyResponsible = (handlingType?: string, deliveryMethod?: string) =>
  deliveryMethod === 'delivery' && ASSEMBLY_RESPONSIBLE_HANDLINGS.has(handlingType?.trim() || '');
