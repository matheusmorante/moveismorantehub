import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import type Person from '@/pages/types/person.type';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type Purchase from '@/pages/types/purchase.type';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import type { PurchaseItem } from '@/pages/types/purchase.type';

interface ReceiptFormHeaderProps {
    initialInboundInvoice?: InboundInvoice | null;
    initialPurchase?: Purchase | null;
    initialReceipt?: GoodsReceipt | null;
    copyReceipt?: boolean;
    items: PurchaseItem[];
    suppliers: Person[];
    supplierId: string;
    setSupplierId: (id: string) => void;
    receiptDate: string;
    setReceiptDate: (date: string) => void;
}

export function ReceiptFormHeader({
    initialInboundInvoice,
    initialPurchase,
    initialReceipt,
    copyReceipt,
    items,
    suppliers,
    supplierId,
    setSupplierId,
    receiptDate,
    setReceiptDate,
}: ReceiptFormHeaderProps) {
    if (initialInboundInvoice) {
        return (
            <section className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                            Dados da NF-e e Fornecedor
                        </h3>
                        <p className="text-xs text-slate-500">
                            Emitente: <b>{initialInboundInvoice.emitterName || 'Emitente não identificado'}</b> · CNPJ: {initialInboundInvoice.emitterCnpj || '—'}
                        </p>
                    </div>
                    {initialInboundInvoice.nfeKey && (
                        <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Chave: {initialInboundInvoice.nfeKey.replace(/(\d{4})/g, '$1 ').trim()}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3 pt-1">
                    <div className="md:col-span-2">
                        <SupplierAutocomplete
                            suppliers={suppliers}
                            selectedSupplierId={supplierId}
                            onSelect={setSupplierId}
                            disabled={true}
                            disabledReason="O fornecedor foi vinculado automaticamente a partir dos dados do emitente da NF-e."
                            customLabel="Fornecedor Vinculado no ERP"
                            placeholder="Fornecedor do ERP..."
                        />
                    </div>
                    <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Data do recebimento
                        <input
                            type="date"
                            value={receiptDate}
                            onChange={(event) => setReceiptDate(event.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                        />
                    </label>
                </div>
            </section>
        );
    }

    return (
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
                <SupplierAutocomplete
                    suppliers={suppliers}
                    selectedSupplierId={supplierId}
                    onSelect={setSupplierId}
                    disabled={Boolean(initialPurchase) || (Boolean(initialReceipt) && !copyReceipt) || items.length > 0}
                    disabledReason={
                        (initialPurchase || (initialReceipt && !copyReceipt))
                            ? 'O fornecedor foi pré-definido pelo documento/pedido de origem.'
                            : items.length > 0
                            ? 'Para alterar o fornecedor, remova os itens adicionados e selecione o fornecedor correto.'
                            : undefined
                    }
                    customLabel="Fornecedor"
                    placeholder="Digite 2 ou mais letras para buscar fornecedor..."
                    minChars={2}
                />
            </div>
            <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Data do recebimento
                <input
                    type="date"
                    value={receiptDate}
                    onChange={(event) => setReceiptDate(event.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none p-2 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                />
            </label>
        </div>
    );
}
