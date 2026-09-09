import { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

const money = (value?: number) => formatCurrency(Number(value || 0));
const percent = (value?: number) => `${Number(value || 0).toFixed(2)}%`;

export function InboundInvoiceItemFiscalReview({ item }: { item: InboundInvoiceItem }) {
  return <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 sm:grid-cols-4">
    <div><dt className="text-slate-400">EAN</dt><dd>{item.ean || '—'}</dd></div><div><dt className="text-slate-400">NCM / CEST</dt><dd>{item.ncm || '—'} {item.cest ? `/ ${item.cest}` : ''}</dd></div>
    <div><dt className="text-slate-400">CFOP</dt><dd>{item.cfop || '—'}</dd></div><div><dt className="text-slate-400">Unitário / total</dt><dd>{money(item.unitCost)} / {money(item.totalCost)}</dd></div>
    <div><dt className="text-slate-400">Desconto / frete</dt><dd>{money(item.discountValue)} / {money(item.freightValue)}</dd></div><div><dt className="text-slate-400">IPI</dt><dd>{percent(item.ipiPercent)} · {money(item.ipiValue)}</dd></div>
    <div><dt className="text-slate-400">ICMS</dt><dd>{percent(item.icmsPercent)} · {money(item.icmsValue)}</dd></div><div><dt className="text-slate-400">ICMS ST</dt><dd>{percent(item.icmsStPercent)} · {money(item.icmsStValue)}</dd></div>
  </dl>;
}
