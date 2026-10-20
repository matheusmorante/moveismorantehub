import Order from '../../../../types/order.type';
import { resolveEffectiveSchedule } from '../../../../../../../shared-utils/commercialOrderRules';

export const normalizeHandling = (value?: string) =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const getItemAssemblyTone = (item: any, allOptions: any[] = []): 'outside' | 'depot' | undefined => {
  const handling = normalizeHandling(item?.handlingType);
  const option = allOptions.find((opt) => normalizeHandling(opt?.label) === handling);
  if (option?.isAssemblyOutside) return 'outside';
  if (option?.includeInAssemblySchedule) return 'depot';
  return undefined;
};

export const checkHasOutsideAssembly = (allItems: any[], allOptions: any[] = []): boolean => {
  return allItems.some((item) => {
    if (!item) return false;
    const hLabel = (item.handlingType || item.handling || '').trim().toLowerCase();
    if (!hLabel) return false;
    const foundOpt = allOptions.find((opt) => (opt?.label || '').trim().toLowerCase() === hLabel);
    if (foundOpt?.isAssemblyOutside) return true;
    return (
      hLabel.includes('fora') ||
      hLabel.includes('externa') ||
      hLabel.includes('cliente') ||
      hLabel.includes('montador')
    );
  });
};

export const checkHasInternalAssembly = (allItems: any[], allOptions: any[] = []): boolean => {
  return allItems.some((item) => {
    if (!item) return false;
    const hLabel = (item.handlingType || item.handling || '').trim().toLowerCase();
    if (!hLabel) return false;
    const foundOpt = allOptions.find((opt) => (opt?.label || '').trim().toLowerCase() === hLabel);
    if (foundOpt?.includeInAssemblySchedule && !foundOpt?.isAssemblyOutside) return true;
    return (
      (hLabel.includes('loja') ||
        hLabel.includes('deposito') ||
        hLabel.includes('depósito') ||
        hLabel.includes('interna') ||
        hLabel.includes('montado')) &&
      !hLabel.includes('fora')
    );
  });
};

export const getStatusIcon = (id: string): string => {
  switch (id) {
    case 'draft':
      return 'bi-file-earmark-text-fill';
    case 'scheduled':
      return 'bi-calendar-check-fill';
    case 'fulfilled':
      return 'bi-check-circle-fill';
    case 'cancelled':
      return 'bi-x-circle-fill';
    default:
      return 'bi-circle-fill';
  }
};

export const resolveCardDisplayTime = (
  order: Order,
  isAssistance: boolean,
  effectiveFormattedTime?: string
): string => {
  const scheduling = order.shipping?.scheduling;
  if (isAssistance) {
    return (order as any).scheduledTime || effectiveFormattedTime || 'Horário não definido';
  }
  if (effectiveFormattedTime) {
    return effectiveFormattedTime;
  }
  if (scheduling) {
    const isRangeVisible = scheduling.type === 'range';
    return isRangeVisible
      ? `${scheduling.startTime} - ${scheduling.endTime}`
      : scheduling.startTime || scheduling.time || 'Horário não definido';
  }
  return 'Horário não definido';
};
