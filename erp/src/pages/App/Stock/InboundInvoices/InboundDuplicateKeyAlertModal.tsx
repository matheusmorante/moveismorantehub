import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

interface Props {
    isOpen: boolean;
    duplicateKey: string;
    existingInvoice?: InboundInvoice | null;
    onClose: () => void;
}

const formatKeyChunked = (key: string) => {
    const clean = key.replace(/\D/g, '');
    if (!clean) return key;
    return clean.match(/.{1,4}/g)?.join(' ') || clean;
};

export function InboundDuplicateKeyAlertModal({ isOpen, duplicateKey, existingInvoice, onClose }: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000005] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
            <section className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                        <i className="bi bi-exclamation-triangle-fill text-2xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                            Nota Fiscal Já Cadastrada
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Esta nota fiscal com a chave de acesso abaixo já está salva no sistema.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Chave de Acesso
                        </span>
                        <span className="mt-1 block font-mono text-xs font-bold text-amber-900 dark:text-amber-200 break-all">
                            {formatKeyChunked(duplicateKey)}
                        </span>
                    </div>

                    {existingInvoice && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-955 space-y-2 text-xs">
                            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2 dark:border-slate-800">
                                <span className="font-black text-slate-800 dark:text-slate-200">
                                    NF-e #{existingInvoice.nfeNumber || 'S/N'} (Série {existingInvoice.series || '1'})
                                </span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(existingInvoice.totalInvoice || 0)}
                                </span>
                            </div>
                            <div className="space-y-1 pt-1 text-slate-600 dark:text-slate-400">
                                <p className="font-bold text-slate-800 dark:text-slate-200">
                                    {existingInvoice.emitterName || 'Emitente não informado'}
                                </p>
                                <p className="text-[11px]">CNPJ: {existingInvoice.emitterCnpj || 'Não informado'}</p>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-amber-700 transition-all cursor-pointer"
                    >
                        Entendi e Fechar
                    </button>
                </footer>
            </section>
        </div>
    );
}
