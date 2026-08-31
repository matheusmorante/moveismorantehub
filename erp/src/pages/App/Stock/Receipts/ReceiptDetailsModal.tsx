import React from 'react';
import { createPortal } from 'react-dom';
import { GoodsReceipt } from '../../../utils/goodsReceiptService';
import { formatCurrency, formatToBRDate } from '../../../utils/formatters';
import { formatGoodsReceiptCode } from '../../../utils/goodsReceiptCode';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    receipt: GoodsReceipt | null;
    onReverse?: (receipt: GoodsReceipt) => void;
};

export default function ReceiptDetailsModal({ isOpen, onClose, receipt, onReverse }: Props) {
    if (!isOpen || !receipt) return null;

    const isDraft = receipt.isDraft || receipt.status === 'draft';
    const isEstornado = receipt.status === 'estornado';
    const rawKey = (receipt.fiscalKey || '').replace(/\D/g, '');
    const formattedFiscalKey = rawKey.length === 44 ? rawKey.match(/.{1,4}/g)?.join(' ') : receipt.fiscalKey;

    const content = (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="relative w-full max-w-4xl rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden my-8">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-5 text-white dark:border-slate-800 xl:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30">
                            <i className="bi bi-box-seam text-lg" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black tracking-tight">Recebimento #{formatGoodsReceiptCode(receipt)}</h2>
                                {isDraft ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-400 border border-amber-500/30">
                                        <i className="bi bi-clock-history text-xs" /> Rascunho
                                    </span>
                                ) : isEstornado ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-red-400 border border-red-500/30">
                                        <i className="bi bi-arrow-counterclockwise text-xs" /> Estornado
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-400 border border-emerald-500/30">
                                        <i className="bi bi-check-circle-fill text-xs" /> Recebido
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">Detalhes completos da movimentação de entrada</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl p-2.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </header>

                {/* Body Content */}
                <div className="p-6 xl:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                    {/* Top Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor / Fábrica</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{receipt.supplierName}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Data do Recebimento</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatToBRDate(receipt.receivedAt)}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Número da NF</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{receipt.invoiceNumber || 'Não informada'}</span>
                        </div>
                    </div>

                    {/* Fiscal Key & Taxes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Chave de Acesso (NF-e)</span>
                            {formattedFiscalKey ? (
                                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 break-all select-all">
                                    {formattedFiscalKey}
                                </span>
                            ) : (
                                <span className="text-xs text-slate-400 italic">Sem chave de acesso cadastrada</span>
                            )}
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm flex items-center justify-around">
                            <div>
                                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">IPI</span>
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{receipt.ipiPercent || 0}%</span>
                            </div>
                            <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                            <div>
                                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Frete</span>
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{receipt.freightPercent || 0}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Attachments Section */}
                    {receipt.attachments && receipt.attachments.length > 0 && (
                        <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-2">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Anexos ({receipt.attachments.length})</span>
                            <div className="flex flex-wrap gap-2">
                                {receipt.attachments.map((url, idx) => (
                                    <a
                                        key={url}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                    >
                                        <i className="bi bi-paperclip text-emerald-600" />
                                        <span>Documento {idx + 1}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Items Table */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Itens Recebidos ({receipt.items.length})</h3>
                        <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider text-[9px]">
                                        <th className="px-4 py-3">Produto / Descrição</th>
                                        <th className="px-4 py-3 text-center">Qtd</th>
                                        <th className="px-4 py-3 text-right">Custo Base</th>
                                        <th className="px-4 py-3 text-right">Custo Unit. Final</th>
                                        <th className="px-4 py-3 text-right">Total Item</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {receipt.items.map((item, index) => (
                                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-slate-800 dark:text-slate-100">{item.description}</p>
                                                {item.code && <p className="text-[10px] text-slate-400 font-mono">Cód: {item.code}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-center font-black text-slate-700 dark:text-slate-200">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                                                {formatCurrency(item.baseCost || item.unitCost)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">
                                                {formatCurrency(item.unitCost)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(item.totalCost || item.quantity * item.unitCost)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-955/40 xl:px-8">
                    <div>
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Valor Total do Recebimento</span>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(receipt.totalValue)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isDraft && !isEstornado && onReverse && (
                            <button
                                type="button"
                                onClick={() => onReverse(receipt)}
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black uppercase text-red-600 hover:bg-red-100 transition-colors"
                            >
                                <i className="bi bi-arrow-counterclockwise mr-2" />
                                Estornar recebimento
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-slate-200 dark:bg-slate-800 px-6 py-2.5 text-xs font-black uppercase text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );

    return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
