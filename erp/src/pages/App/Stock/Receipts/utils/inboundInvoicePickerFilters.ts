import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import type { DateFilterConfig } from '@/pages/App/Stock/InboundInvoices/components/InboundInvoicesHeader';
import { hasCompleteInboundInvoiceItems } from '@/pages/App/Stock/InboundInvoices/inboundReceiptEligibility';
import { supplierProvidesStockOrigin } from '../../../../../../../shared-utils/productSupplierStockOrigin';

export const normalizeDigits = (value: string): string => value.replace(/\D/g, '');

export const getCurrentYearMonth = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const getPreviousYearMonth = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const statusLabel = (status?: string): string => {
  switch (status) {
    case 'received':
      return 'Recebida no Estoque';
    case 'manifested':
      return 'Manifestada';
    case 'pending':
    default:
      return 'Disponível';
  }
};

export const isInDateFilter = (value: string | undefined, filter: DateFilterConfig): boolean => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const ym = `${y}-${String(m).padStart(2, '0')}`;

  if (filter.mode === 'current_month') {
    return y === now.getFullYear() && date.getMonth() === now.getMonth();
  }
  if (filter.mode === 'previous_month') {
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return y === prevMonthDate.getFullYear() && date.getMonth() === prevMonthDate.getMonth();
  }
  if (filter.mode === 'current_year') {
    return y === now.getFullYear();
  }
  if (filter.mode === 'previous_year') {
    return y === now.getFullYear() - 1;
  }
  if (filter.mode === 'custom_month') {
    return ym === filter.customMonth;
  }
  if (filter.mode === 'custom_range') {
    return (
      (!filter.startMonth || ym >= filter.startMonth) && (!filter.endMonth || ym <= filter.endMonth)
    );
  }
  return true;
};

export const filterInboundInvoicesForReceipt = (
  invoices: InboundInvoice[],
  searchTerm: string,
  dateFilter: DateFilterConfig
): InboundInvoice[] => {
  const term = normalizeSearchTerm(searchTerm);
  const termDigits = normalizeDigits(searchTerm);

  return invoices
    .filter((inv) => inv.status !== 'received')
    .filter((inv) => !/<(?:[\w.-]+:)?resNFe\b/i.test(inv.rawXml || ''))
    .filter(hasCompleteInboundInvoiceItems)
    .filter((inv) => supplierProvidesStockOrigin(inv.supplierStockOrigins, 'normal'))
    .filter((inv) => isInDateFilter(inv.issuedAt, dateFilter))
    .filter((inv) => {
      if (!term) return true;
      const emitter = normalizeSearchTerm(inv.emitterName || '');
      const cnpj = normalizeDigits(inv.emitterCnpj || '');
      const key = normalizeDigits(inv.nfeKey || '');
      const number = normalizeDigits(inv.nfeNumber || '');
      return (
        emitter.includes(term) ||
        (termDigits.length > 0 &&
          (cnpj.includes(termDigits) || number.includes(termDigits) || key.includes(termDigits)))
      );
    })
    .sort((left, right) => Number(new Date(right.issuedAt)) - Number(new Date(left.issuedAt)));
};
