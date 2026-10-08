import { formatCurrency } from '../../formatters';

export function escapeDanfeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDanfeMoney(value: string | number | undefined): string {
  const numeric = Number(value || 0);
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0).replace('R$', '').trim();
}

export function formatDanfeDecimal(value: string | undefined, fallback = '0'): string {
  return value ? escapeDanfeHtml(value.replace('.', ',')) : fallback;
}
