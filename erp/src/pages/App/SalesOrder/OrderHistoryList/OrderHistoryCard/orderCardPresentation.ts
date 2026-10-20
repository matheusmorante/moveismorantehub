import Order from '../../../../types/order.type';
import { AppSettings } from '@/pages/utils/settingsService';
import { getOrderStatusLabel } from '@/pages/utils/orderStatusPresentation';
import { OrderStatusConfigMap } from './OrderHistoryCard.types';

export function resolveCardCapabilities(order: Order) {
  const isDraft = order.status === 'draft';
  const isCancelled = order.status === 'cancelled';
  const canViewDetails =
    ['scheduled', 'fulfilled', 'cancelled'].includes(order.status || '') ||
    (order.orderType === 'budget' && order.status === 'quoted');
  const isEditLocked =
    (order.status === 'fulfilled' || isCancelled) &&
    ['sale', 'showroom', 'return'].includes(order.orderType || 'sale');

  return { isDraft, isCancelled, canViewDetails, isEditLocked };
}

export function buildOrderCardStatusConfig(
  order: Order,
  settings: AppSettings
): OrderStatusConfigMap {
  const statuses = (
    settings.orderStatuses || [
      { id: 'draft', label: 'Rascunho', color: 'slate' },
      { id: 'scheduled', label: 'Agendado', color: 'amber' },
      { id: 'fulfilled', label: 'Atendido', color: 'emerald' },
      { id: 'cancelled', label: 'Cancelado', color: 'rose' },
    ]
  )
    .map((s) => (s.id === 'draft' ? { ...s, label: 'Rascunho' } : s))
    .filter((s) => s.id !== 'chargeback' && s.id !== 'disputed');

  const statusConfig: OrderStatusConfigMap = {};
  statuses.forEach((s) => {
    statusConfig[s.id] = {
      label: s.label,
      bg: `bg-${s.color}-${s.color === 'slate' ? '100' : '50'}`,
      text: `text-${s.color}-${s.color === 'slate' ? '500' : '600'}`,
      dot: `bg-${s.color}-${s.color === 'slate' ? '400' : '500'}`,
    };
  });

  if (statusConfig.fulfilled) {
    statusConfig.fulfilled.label = getOrderStatusLabel(
      { ...order, status: 'fulfilled' },
      statusConfig.fulfilled.label
    );
  }

  if (order.orderType === 'budget' && order.status === 'quoted') {
    statusConfig.quoted = {
      label: 'Orçamento cadastrado',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
    };
  }

  if (statusConfig.scheduled) {
    statusConfig.scheduled.label = getOrderStatusLabel(
      { ...order, status: 'scheduled' },
      statusConfig.scheduled.label
    );
  }

  return statusConfig;
}

export function resolveCardHeaderAccentClass(
  order: Order,
  colorKey: string,
  isDraft: boolean,
  isCancelled: boolean
): string {
  if (isCancelled) {
    return 'bg-red-100/90 dark:bg-red-900/60 border-b border-red-200 dark:border-red-800';
  }

  if (order.orderType === 'budget') {
    return isDraft
      ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/30'
      : 'bg-indigo-100/70 dark:bg-indigo-900/30 border-b border-indigo-200/60 dark:border-indigo-900/40';
  }

  if (isDraft) {
    return 'bg-slate-100/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700';
  }

  switch (colorKey) {
    case 'green':
      return 'bg-emerald-200/90 dark:bg-emerald-950/80 border-b border-emerald-300 dark:border-emerald-800';
    case 'purple':
      return 'bg-purple-400 dark:bg-purple-800/80 border-b border-purple-500 dark:border-purple-700';
    case 'orange':
      return 'bg-orange-50/80 dark:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900/30';
    default:
      return 'bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700';
  }
}

export function resolveCardBgBorderClass(isCancelled: boolean): string {
  return isCancelled
    ? 'bg-red-50/90 dark:bg-red-950/40 border-2 border-red-500 dark:border-red-600 shadow-xs ring-1 ring-red-500/20'
    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
}

export function resolveCardTimeDisplay(sched?: Order['shipping']['scheduling']): string {
  if (!sched || sched.pendingScheduling) return '';
  if (sched.notInformed) return 'Não informado';
  if (sched.type === 'range' && sched.startTime && sched.endTime) {
    return `${sched.startTime} às ${sched.endTime}`;
  }
  if (sched.startTime) return sched.startTime;
  if (sched.time) return sched.time;
  return '';
}
