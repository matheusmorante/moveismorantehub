import React from 'react';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

interface InboundInvoicesTableProps {
    invoices: InboundInvoice[];
    onViewDetails: (invoice: InboundInvoice) => void;
    onReceiveGoods: (invoice: InboundInvoice) => void;
    onDownloadXml: (invoice: InboundInvoice) => void;
}

export const InboundInvoicesTable: React.FC<InboundInvoicesTableProps> = ({
    invoices,
    onViewDetails,
    onReceiveGoods,
    onDownloadXml
}) => {
    if (invoices.length === 0) {
        return (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-12 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <i className="bi bi-file-earmark-check text-4xl text-slate-300 dark:text-slate-700" />
                <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">Nenhuma nota fiscal de entrada encontrada</p>
                <p className="mt-1 text-xs text-slate-400">Clique em "Consultar SEFAZ" ou "Importar XML" para sincronizar notas de fornecedores.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Tabela para telas XL em diante (>= 1280px) */}
            <div className="hidden xl:block overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                        <tr>
                            <th className="py-3.5 pl-6 pr-3">NF-e / Série</th>
                            <th className="px-3 py-3.5">Fornecedor / Emitente</th>
                            <th className="px-3 py-3.5">Data Emissão</th>
                            <th className="px-3 py-3.5">Itens</th>
                            <th className="px-3 py-3.5">Valor Total</th>
                            <th className="px-3 py-3.5">Status</th>
                            <th className="py-3.5 pl-3 pr-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/40">
                                <td className="py-4 pl-6 pr-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                    <div>#{inv.nfeNumber}</div>
                                    <span className="text-[10px] text-slate-400 font-sans font-normal">Série {inv.series}</span>
                                </td>
                                <td className="px-3 py-4">
                                    <div className="font-bold text-slate-800 dark:text-slate-100">{inv.emitterName}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">CNPJ: {inv.emitterCnpj}</div>
                                </td>
                                <td className="px-3 py-4 text-slate-600 dark:text-slate-300 font-medium">
                                    {new Date(inv.issuedAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-3 py-4 font-bold text-slate-700 dark:text-slate-200">
                                    {inv.itemsCount || inv.items.length} itens
                                </td>
                                <td className="px-3 py-4 font-black text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(inv.totalInvoice)}
                                </td>
                                <td className="px-3 py-4">
                                    {inv.status === 'received' ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                            <i className="bi bi-check-circle-fill text-[11px]" /> Recebida no Estoque
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                            <i className="bi bi-hourglass-split text-[11px]" /> Disponível
                                        </span>
                                    )}
                                </td>
                                <td className="py-4 pl-3 pr-6 text-right space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => onViewDetails(inv)}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                    >
                                        <i className="bi bi-eye mr-1 text-slate-400" /> Ver Itens
                                    </button>
                                    {inv.status !== 'received' && (
                                        <button
                                            type="button"
                                            onClick={() => onReceiveGoods(inv)}
                                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-emerald-700"
                                        >
                                            <i className="bi bi-box-arrow-in-down mr-1" /> Receber
                                        </button>
                                    )}
                                    {inv.rawXml && (
                                        <button
                                            type="button"
                                            title="Baixar XML"
                                            onClick={() => onDownloadXml(inv)}
                                            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            <i className="bi bi-download" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Cards para telas menores que XL (< 1280px) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:hidden">
                {invoices.map((inv) => (
                    <div key={inv.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">NF-e #{inv.nfeNumber}</span>
                                <span className="ml-2 text-[10px] text-slate-400 font-mono">Série {inv.series}</span>
                            </div>
                            {inv.status === 'received' ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    Recebida
                                </span>
                            ) : (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                    Disponível
                                </span>
                            )}
                        </div>

                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{inv.emitterName}</p>
                        <p className="text-[10px] font-mono text-slate-400 mb-3">CNPJ: {inv.emitterCnpj}</p>

                        <div className="flex justify-between items-center text-xs py-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400">{inv.itemsCount || inv.items.length} itens</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.totalInvoice)}</span>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => onViewDetails(inv)}
                                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                            >
                                Detalhes
                            </button>
                            {inv.status !== 'received' && (
                                <button
                                    type="button"
                                    onClick={() => onReceiveGoods(inv)}
                                    className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-black uppercase text-white hover:bg-emerald-700"
                                >
                                    Receber
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
