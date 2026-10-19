import type { PurchaseStatus } from '../../mobilePurchaseService';

export const money = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const date = (value?: string): string =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '—';

export const statusMeta = (status: PurchaseStatus) =>
  ({
    ordered: { label: 'Em Ordem', bg: '#fef3c7', color: '#b45309' },
    fulfilled: { label: 'Atendido', bg: '#d1fae5', color: '#047857' },
    cancelled: { label: 'Cancelado', bg: '#fee2e2', color: '#b91c1c' },
  })[status];
