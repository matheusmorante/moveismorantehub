import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

interface InboundInvoiceFiscalReviewProps {
    readonly invoice: InboundInvoice;
}

const percent = (value?: number): string => {
    const num = Number(value || 0);
    return `${Number.isNaN(num) ? '0.00' : num.toFixed(2)}%`;
};

export function InboundInvoiceFiscalReview({ invoice }: InboundInvoiceFiscalReviewProps) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Dados fiscais extraídos
            </h3>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                <p className="text-slate-600 dark:text-slate-300">
                    Número / série: <b className="text-slate-800 dark:text-slate-100">{invoice.nfeNumber || '—'} / {invoice.series || '—'}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    Modelo: <b className="text-slate-800 dark:text-slate-100">{invoice.model || '—'}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    Protocolo: <b className="text-slate-800 dark:text-slate-100">{invoice.protocol || '—'}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    Emitente: <b className="text-slate-800 dark:text-slate-100">{invoice.emitterName || '—'} · {invoice.emitterCnpj || '—'}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    IE: <b className="text-slate-800 dark:text-slate-100">{invoice.emitterIe || '—'}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    Destinatário: <b className="text-slate-800 dark:text-slate-100">{invoice.recipientName || '—'} · {invoice.recipientCnpj || '—'}</b>
                </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 border-t border-slate-200/60 dark:border-slate-800 pt-3">
                <p className="text-slate-600 dark:text-slate-300">
                    Produtos: <b className="text-slate-800 dark:text-slate-100">{formatCurrency(invoice.totalProducts)}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    Frete: <b className="text-slate-800 dark:text-slate-100">{formatCurrency(invoice.totalFreight)} · {percent(invoice.freightPercent)}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    IPI: <b className="text-slate-800 dark:text-slate-100">{formatCurrency(invoice.totalIpi)} · {percent(invoice.ipiPercent)}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    ICMS: <b className="text-slate-800 dark:text-slate-100">{formatCurrency(invoice.totalIcms || 0)}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    ICMS ST: <b className="text-slate-800 dark:text-slate-100">{formatCurrency(invoice.totalIcmsSt || 0)}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    Desconto: <b className="text-slate-800 dark:text-slate-100">{formatCurrency(invoice.totalDiscount || 0)}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    Seguro: <b className="text-slate-800 dark:text-slate-100">{formatCurrency(invoice.totalInsurance || 0)}</b>
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                    Outras despesas: <b className="text-slate-800 dark:text-slate-100">{formatCurrency(invoice.totalOtherExpenses || 0)}</b>
                </p>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                Natureza: {invoice.operationNature || 'Não informada'} · Emissão: {invoice.issuedAt || 'Não informada'} · Saída/entrada: {invoice.entryExitAt || 'Não informada'}
            </p>
            {invoice.additionalInfo && (
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Observações: {invoice.additionalInfo}
                </p>
            )}
        </section>
    );
}

export default InboundInvoiceFiscalReview;
