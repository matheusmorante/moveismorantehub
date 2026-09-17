import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

interface InboundInvoiceItemFiscalReviewProps {
    readonly item: InboundInvoiceItem;
}

const percent = (value?: number): string => {
    const num = Number(value || 0);
    return `${Number.isNaN(num) ? '0.00' : num.toFixed(2)}%`;
};

export function InboundInvoiceItemFiscalReview({ item }: InboundInvoiceItemFiscalReviewProps) {
    return (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Dados Tributários e Identificação</h5>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400 sm:grid-cols-4">
                <div>
                    <dt className="text-[9px] uppercase tracking-wider text-slate-400 opacity-80">EAN</dt>
                    <dd className="font-semibold text-slate-600 dark:text-slate-300">{item.ean || '—'}</dd>
                </div>
                <div>
                    <dt className="text-[9px] uppercase tracking-wider text-slate-400 opacity-80">NCM / CEST</dt>
                    <dd className="font-semibold text-slate-600 dark:text-slate-300">{item.ncm || '—'} {item.cest ? `/ ${item.cest}` : ''}</dd>
                </div>
                <div>
                    <dt className="text-[9px] uppercase tracking-wider text-slate-400 opacity-80">CFOP</dt>
                    <dd className="font-semibold text-slate-600 dark:text-slate-300">{item.cfop || '—'}</dd>
                </div>
                
                {/* ICMS Normal */}
                <div>
                    <dt className="text-[9px] uppercase tracking-wider text-slate-400 opacity-80">ICMS {item.icmsCst ? `(CST ${item.icmsCst})` : ''}</dt>
                    <dd className="font-semibold text-slate-600 dark:text-slate-300">
                        {item.icmsValue ? `${percent(item.icmsPercent)} • ${formatCurrency(item.icmsValue)}` : 'Isento/Sem Destaque'}
                    </dd>
                </div>
                
                {/* ICMS ST */}
                {Number(item.icmsStValue) > 0 && (
                    <div>
                        <dt className="text-[9px] uppercase tracking-wider text-slate-400 opacity-80">ICMS ST</dt>
                        <dd className="font-semibold text-slate-600 dark:text-slate-300">
                            {percent(item.icmsStPercent)} • {formatCurrency(item.icmsStValue!)}
                        </dd>
                    </div>
                )}
                
                {/* PIS */}
                {Number(item.pisValue) > 0 && (
                    <div>
                        <dt className="text-[9px] uppercase tracking-wider text-slate-400 opacity-80">PIS {item.pisCst ? `(CST ${item.pisCst})` : ''}</dt>
                        <dd className="font-semibold text-slate-600 dark:text-slate-300">
                            {percent(item.pisPercent)} • {formatCurrency(item.pisValue!)}
                        </dd>
                    </div>
                )}
                
                {/* COFINS */}
                {Number(item.cofinsValue) > 0 && (
                    <div>
                        <dt className="text-[9px] uppercase tracking-wider text-slate-400 opacity-80">COFINS {item.cofinsCst ? `(CST ${item.cofinsCst})` : ''}</dt>
                        <dd className="font-semibold text-slate-600 dark:text-slate-300">
                            {percent(item.cofinsPercent)} • {formatCurrency(item.cofinsValue!)}
                        </dd>
                    </div>
                )}
                
                {/* IBS/CBS (Reforma Tributária) */}
                {(Number(item.ibsValue) > 0 || Number(item.cbsValue) > 0) && (
                    <div>
                        <dt className="text-[9px] uppercase tracking-wider text-slate-400 opacity-80">IBS / CBS</dt>
                        <dd className="font-semibold text-slate-600 dark:text-slate-300">
                            {formatCurrency(item.ibsValue || 0)} / {formatCurrency(item.cbsValue || 0)}
                        </dd>
                    </div>
                )}
            </dl>
        </div>
    );
}

export default InboundInvoiceItemFiscalReview;
