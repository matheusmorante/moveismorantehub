import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

const percent = (value?: number) => `${Number(value || 0).toFixed(2)}%`;

export function InboundInvoiceFiscalReview({ invoice }: { invoice: InboundInvoice }) {
  return <section className="rounded-2xl border p-4">
    <h3 className="text-xs font-black uppercase text-slate-500">Dados fiscais extraídos</h3>
    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
      <p>Número / série <b>{invoice.nfeNumber || '—'} / {invoice.series || '—'}</b></p><p>Modelo <b>{invoice.model || '—'}</b></p><p>Protocolo <b>{invoice.protocol || '—'}</b></p>
      <p>Emitente <b>{invoice.emitterName || '—'} · {invoice.emitterCnpj || '—'}</b></p><p>IE <b>{invoice.emitterIe || '—'}</b></p><p>Destinatário <b>{invoice.recipientName || '—'} · {invoice.recipientCnpj || '—'}</b></p>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      <p>Produtos <b>{formatCurrency(invoice.totalProducts)}</b></p><p>Frete <b>{formatCurrency(invoice.totalFreight)} · {percent(invoice.freightPercent)}</b></p>
      <p>IPI <b>{formatCurrency(invoice.totalIpi)} · {percent(invoice.ipiPercent)}</b></p><p>ICMS <b>{formatCurrency(invoice.totalIcms || 0)}</b></p>
      <p>ICMS ST <b>{formatCurrency(invoice.totalIcmsSt || 0)}</b></p><p>Desconto <b>{formatCurrency(invoice.totalDiscount || 0)}</b></p>
      <p>Seguro <b>{formatCurrency(invoice.totalInsurance || 0)}</b></p><p>Outras despesas <b>{formatCurrency(invoice.totalOtherExpenses || 0)}</b></p>
    </div>
    <p className="mt-3 text-[11px] text-slate-500">Natureza: {invoice.operationNature || 'Não informada'} · Emissão: {invoice.issuedAt || 'Não informada'} · Saída/entrada: {invoice.entryExitAt || 'Não informada'}</p>
    {invoice.additionalInfo && <p className="mt-2 text-[11px] text-slate-500">Observações: {invoice.additionalInfo}</p>}
  </section>;
}
