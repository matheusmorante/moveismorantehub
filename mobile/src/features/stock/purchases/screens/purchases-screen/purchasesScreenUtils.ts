import type { PurchaseStatus } from '../../mobilePurchaseService';

export const money = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const date = (value?: string): string =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '—';

export const statusMeta = (status: PurchaseStatus) =>
  ({
    draft: { label: 'Rascunho', bg: '#e0e7ff', color: '#4338ca' },
    pending: { label: 'Pendente', bg: '#fef3c7', color: '#b45309' },
    ordered: { label: 'Em Ordem', bg: '#dbeafe', color: '#1d4ed8' },
    fulfilled: { label: 'Atendido', bg: '#d1fae5', color: '#047857' },
    cancelled: { label: 'Cancelado', bg: '#fee2e2', color: '#b91c1c' },
  })[status];
