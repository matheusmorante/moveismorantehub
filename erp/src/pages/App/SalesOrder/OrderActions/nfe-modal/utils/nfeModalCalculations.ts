import type Order from '@/pages/types/order.type';
import type { NfeItemWithFiscal } from '../NfeItemsSection';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import {
  decideFiscalRecipientRequirements,
  fiscalPresence,
} from '../../../../../../../../shared-utils/fiscalDocumentModel';

export interface ComputeInvoiceTotalsInput {
  order: Order;
  nfeItems: NfeItemWithFiscal[];
}

export interface InvoiceTotals {
  itemsTotal: number;
  freightTotal: number;
  discountTotal: number;
  invoiceTotal: number;
}

export function computeInvoiceTotals({
  order,
  nfeItems,
}: ComputeInvoiceTotalsInput): InvoiceTotals {
  const activeItems = nfeItems.length ? nfeItems : order.items || [];
  const itemsTotal = activeItems
    .filter((it) => it.itemType !== 'service')
    .reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
  const freightTotal = Number(order.shipping?.value) || 0;
  const discountTotal = Number(order.itemsSummary?.totalFixedDiscount) || 0;
  const invoiceTotal =
    Number(order.paymentsSummary?.totalOrderValue) || itemsTotal + freightTotal - discountTotal;

  return { itemsTotal, freightTotal, discountTotal, invoiceTotal };
}

export function resolveModelLabel(selectedModel?: '55' | '65'): string {
  if (selectedModel === '65') return 'NFC-e · modelo 65';
  if (selectedModel === '55') return 'NF-e · modelo 55 necessária';
  return 'Modelo fiscal a definir';
}

export function resolveNumberPreviewContext({
  emissionResult,
  nfeNumberSequence,
  environment,
}: {
  emissionResult: NfeEmissionResult | null;
  nfeNumberSequence: { series: string | null };
  environment: 1 | 2;
}): string {
  const isPendingWithNumber = Boolean(emissionResult?.pending && emissionResult.nfeNumber);
  const title = isPendingWithNumber
    ? 'Número reservado na tentativa pendente'
    : 'Prévia informativa';
  const series = isPendingWithNumber
    ? emissionResult?.series ?? nfeNumberSequence.series ?? '—'
    : nfeNumberSequence.series ?? '—';
  const envLabel = environment === 2 ? 'Homologação' : 'Produção';

  return `${title} · Série ${series} · ${envLabel}`;
}

export function resolveRecipientRequirementsForModal({
  selectedModel,
  order,
  invoiceTotal,
  customerPersonType,
  recipientTaxId,
}: {
  selectedModel?: '55' | '65';
  order: Order;
  invoiceTotal: number;
  customerPersonType?: string;
  recipientTaxId: string;
}) {
  const presence = fiscalPresence(
    selectedModel || '55',
    order.shipping?.deliveryMethod,
    order.fiscalContext?.presence
  );

  return decideFiscalRecipientRequirements({
    model: selectedModel || '55',
    presence,
    total: invoiceTotal,
    personType: customerPersonType,
    recipientTaxId: customerPersonType ? recipientTaxId : '',
    operationScope: 'NORMAL_DOMESTIC_SALE',
  });
}
