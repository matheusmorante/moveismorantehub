import React, { useState, useRef, useEffect } from 'react';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

interface InboundInvoicesTableProps {
    invoices: InboundInvoice[];
    onViewDetails: (invoice: InboundInvoice) => void;
    onDownloadXml: (invoice: InboundInvoice) => void;
    onManageMappings: (invoice: InboundInvoice) => void;
}

export const InboundInvoicesTable: React.FC<InboundInvoicesTableProps> = ({
    invoices,
    onViewDetails,
    onDownloadXml,
    onManageMappings,
}) => {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (invoices.length === 0) {
        return (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-12 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <i className="bi bi-file-earmark-check text-4xl text-slate-300 dark:text-slate-700" />
                <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">Nenhuma nota fiscal de entrada encontrada</p>
                <p className="mt-1 text-xs text-slate-400">Você pode adicionar novas notas fiscais ou importar XMLs recebidos de fornecedores.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Tabela para telas XL em diante (>= 1280px) */}
            <div className="hidden xl:block rounded-3xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                        <tr>
                            <th className="py-3.5 pl-6 pr-3 rounded-tl-3xl">NF-e / Série</th>
                            <th className="px-3 py-3.5">Fornecedor / Emitente</th>
                            <th className="px-3 py-3.5">Data Emissão</th>
                            <th className="px-3 py-3.5">Itens</th>
                            <th className="px-3 py-3.5">Valor Total</th>
                            <th className="px-3 py-3.5">Status</th>
                            <th className="py-3.5 pl-3 pr-6 text-right rounded-tr-3xl">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {invoices.map((inv) => {
                            const isMenuOpen = openMenuId === inv.id;
                            return (
                                <tr
                                    key={inv.id}
                                    onClick={() => onViewDetails(inv)}
                                    className={`hover:bg-slate-50/70 transition-colors cursor-pointer dark:hover:bg-slate-800/40 ${
                                        isMenuOpen ? 'relative z-30 bg-slate-50/90 dark:bg-slate-800/80' : 'relative z-0'
                                    }`}
                                >
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
                                <td className={`py-4 pl-3 pr-6 text-right ${isMenuOpen ? 'relative z-50' : 'relative z-10'}`} onClick={(e) => e.stopPropagation()}>
                                    <div className="relative inline-block text-left" ref={openMenuId === inv.id ? menuRef : null}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === inv.id ? null : inv.id);
                                            }}
                                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                                            title="Mais opções"
                                        >
                                            <i className="bi bi-three-dots-vertical text-base" />
                                        </button>

                                        {openMenuId === inv.id && (
                                            <div className="absolute right-0 z-[100] mt-1 w-48 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(null);
                                                        onManageMappings(inv);
                                                    }}
                                                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                                >
                                                    <i className="bi bi-link-45deg text-blue-600 text-sm" />
                                                    Editar Vínculos
                                                </button>

                                                {inv.rawXml && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            onDownloadXml(inv);
                                                        }}
                                                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                                    >
                                                        <i className="bi bi-download text-slate-400 text-sm" />
                                                        Baixar XML
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* Cards para telas menores que XL (< 1280px) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:hidden">
                {invoices.map((inv) => {
                    const isCardMenuOpen = openMenuId === inv.id;
                    return (
                        <div
                            key={inv.id}
                            onClick={() => onViewDetails(inv)}
                            className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer dark:border-slate-800 dark:bg-slate-900 relative ${
                                isCardMenuOpen ? 'z-30' : 'z-0'
                            }`}
                        >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">NF-e #{inv.nfeNumber}</span>
                                <span className="ml-2 text-[10px] text-slate-400 font-mono">Série {inv.series}</span>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {inv.status === 'received' ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        Recebida
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                        Disponível
                                    </span>
                                )}

                                <div className="relative inline-block text-left" ref={openMenuId === inv.id ? menuRef : null}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === inv.id ? null : inv.id);
                                        }}
                                        className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                                        title="Mais opções"
                                    >
                                        <i className="bi bi-three-dots-vertical text-sm" />
                                    </button>

                                    {openMenuId === inv.id && (
                                        <div className="absolute right-0 z-[100] mt-1 w-48 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(null);
                                                    onManageMappings(inv);
                                                }}
                                                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                            >
                                                <i className="bi bi-link-45deg text-blue-600 text-sm" />
                                                Editar Vínculos
                                            </button>

                                            {inv.rawXml && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(null);
                                                        onDownloadXml(inv);
                                                    }}
                                                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                                >
                                                    <i className="bi bi-download text-slate-400 text-sm" />
                                                    Baixar XML
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{inv.emitterName}</p>
                        <p className="text-[10px] font-mono text-slate-400 mb-3">CNPJ: {inv.emitterCnpj}</p>

                        <div className="flex justify-between items-center text-xs py-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400">{inv.itemsCount || inv.items.length} itens</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.totalInvoice)}</span>
                        </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

