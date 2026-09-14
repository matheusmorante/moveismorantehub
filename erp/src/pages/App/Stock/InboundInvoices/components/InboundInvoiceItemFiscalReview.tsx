import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

interface InboundInvoiceItemFiscalReviewProps {
    readonly item: InboundInvoiceItem;
}

const money = (value?: number): string => {
    const num = Number(value || 0);
    return formatCurrency(Number.isNaN(num) ? 0 : num);
};

const percent = (value?: number): string => {
    const num = Number(value || 0);
    return `${Number.isNaN(num) ? '0.00' : num.toFixed(2)}%`;
};

export function InboundInvoiceItemFiscalReview({ item }: InboundInvoiceItemFiscalReviewProps) {
    return (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300 sm:grid-cols-4">
            <div>
                <dt className="text-slate-400">EAN</dt>
                <dd className="font-semibold">{item.ean || '—'}</dd>
            </div>
            <div>
                <dt className="text-slate-400">NCM / CEST</dt>
                <dd className="font-semibold">{item.ncm || '—'} {item.cest ? `/ ${item.cest}` : ''}</dd>
            </div>
            <div>
                <dt className="text-slate-400">CFOP</dt>
                <dd className="font-semibold">{item.cfop || '—'}</dd>
            </div>
            <div>
                <dt className="text-slate-400">Unitário / total</dt>
                <dd className="font-semibold">{money(item.unitCost)} / {money(item.totalCost)}</dd>
            </div>
            <div>
                <dt className="text-slate-400">Desconto / frete</dt>
                <dd className="font-semibold">{money(item.discountValue)} / {money(item.freightValue)}</dd>
            </div>
            <div>
                <dt className="text-slate-400">IPI</dt>
                <dd className="font-semibold">{percent(item.ipiPercent)} · {money(item.ipiValue)}</dd>
            </div>
            <div>
                <dt className="text-slate-400">ICMS</dt>
                <dd className="font-semibold">{percent(item.icmsPercent)} · {money(item.icmsValue)}</dd>
            </div>
            <div>
                <dt className="text-slate-400">ICMS ST</dt>
                <dd className="font-semibold">{percent(item.icmsStPercent)} · {money(item.icmsStValue)}</dd>
            </div>
        </dl>
    );
}

export default InboundInvoiceItemFiscalReview;
