import React, { useState, useRef, useEffect } from 'react';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

interface InboundInvoicesTableProps {
    readonly invoices: readonly InboundInvoice[];
    readonly onViewDetails: (invoice: InboundInvoice) => void;
    readonly onDownloadXml: (invoice: InboundInvoice) => void;
    readonly onManageMappings: (invoice: InboundInvoice) => void;
    readonly onDelete: (invoice: InboundInvoice) => void;
    readonly onFetchXml?: (invoice: InboundInvoice) => void;
}

export const InboundInvoicesTable: React.FC<InboundInvoicesTableProps> = ({
    invoices,
    onViewDetails,
    onDownloadXml,
    onManageMappings,
    onDelete,
    onFetchXml,
}) => {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
    const desktopMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!desktopMenuRef.current?.contains(target) && !mobileMenuRef.current?.contains(target)) {
                setOpenMenuId(null);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    if (invoices.length === 0) {
        return (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-12 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <i className="bi bi-file-earmark-check text-4xl text-slate-300 dark:text-slate-700" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">Nenhuma nota fiscal de entrada encontrada</p>
                <p className="mt-1 text-xs text-slate-400">Você pode adicionar novas notas fiscais ou importar XMLs recebidos de fornecedores.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Tabela para desktop e tablet (>= 768px); o mobile usa cards. */}
            <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                        <tr>
                            <th scope="col" className="py-3.5 pl-6 pr-3 rounded-tl-3xl">NF-e / Série</th>
                            <th scope="col" className="px-3 py-3.5">Fornecedor / Emitente</th>
                            <th scope="col" className="px-3 py-3.5">Data Emissão</th>
                            <th scope="col" className="px-3 py-3.5">Itens</th>
                            <th scope="col" className="px-3 py-3.5">Valor Total</th>
                            <th scope="col" className="px-3 py-3.5">Status</th>
                            <th scope="col" className="py-3.5 pl-3 pr-6 text-right rounded-tr-3xl">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {invoices.map((inv) => {
                            const isMenuOpen = openMenuId === inv.id;
                            const isSummaryOnly = (!inv.items || inv.items.length === 0) && Boolean(inv.rawXml?.includes('<resNFe'));
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
                                        <div className="hidden xl:block text-[10px] text-slate-400 font-mono">CNPJ: {inv.emitterCnpj}</div>
                                    </td>
                                    <td className="px-3 py-4 text-slate-600 dark:text-slate-300 font-medium">
                                        {new Date(inv.issuedAt).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-3 py-4 font-bold text-slate-700 dark:text-slate-200">
                                        {isSummaryOnly ? '— itens' : `${inv.itemsCount || inv.items.length} itens`}
                                    </td>
                                    <td className="px-3 py-4 font-black text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(inv.totalInvoice)}
                                    </td>
                                    <td className="px-3 py-4">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {isSummaryOnly ? (
                                                <>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40">
                                                        NOVA • SEFAZ
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40">
                                                        XML PENDENTE
                                                    </span>
                                                    {onFetchXml && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onFetchXml(inv);
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                                                        >
                                                            <i className="bi bi-cloud-arrow-down-fill text-[10px]" />
                                                            Obter XML
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {inv.status === 'received' ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                            <i className="bi bi-check-circle-fill text-[11px]" aria-hidden="true" /> Recebida no Estoque
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                                            <i className="bi bi-hourglass-split text-[11px]" aria-hidden="true" /> Disponível
                                                        </span>
                                                    )}
                                                    {inv.items && inv.items.length > 0 && inv.items.every((item) => Boolean(item.matchedProductId)) ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                            <i className="bi bi-check2-all text-xs" aria-hidden="true" /> Vinculação Completa
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                            <i className="bi bi-exclamation-circle text-xs" aria-hidden="true" /> Vinculações Pendentes
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className={`py-4 pl-3 pr-6 text-right ${isMenuOpen ? 'relative z-50' : 'relative z-10'}`} onClick={(e) => e.stopPropagation()}>
                                        <div className="relative inline-block text-left" ref={openMenuId === inv.id ? desktopMenuRef : null}>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === inv.id ? null : inv.id);
                                                }}
                                                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                                                title="Mais opções"
                                                aria-label="Mais opções"
                                                aria-haspopup="true"
                                                aria-expanded={isMenuOpen}
                                            >
                                                <i className="bi bi-three-dots-vertical text-base" aria-hidden="true" />
                                            </button>

                                            {openMenuId === inv.id && (
                                                <div
                                                    role="menu"
                                                    aria-label="Opções da nota fiscal"
                                                    className="absolute right-0 z-[100] mt-1 w-48 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95"
                                                >
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            onManageMappings(inv);
                                                        }}
                                                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                                    >
                                                        <i className="bi bi-link-45deg text-blue-600 text-sm" aria-hidden="true" />
                                                        Gerenciar vínculos
                                                    </button>

                                                    {inv.rawXml && (
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(null);
                                                                onDownloadXml(inv);
                                                            }}
                                                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                                        >
                                                            <i className="bi bi-download text-slate-400 text-sm" aria-hidden="true" />
                                                            Baixar XML
                                                        </button>
                                                    )}

                                                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                                                    {confirmingDeleteId === inv.id ? (
                                                        <div className="px-4 py-2 space-y-1.5">
                                                            <p className="text-[10px] font-bold text-red-600 dark:text-red-400">Confirmar remoção?</p>
                                                            <p className="text-[9px] text-slate-400">Recebimentos e vínculos não são afetados.</p>
                                                            <div className="flex gap-2 pt-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenuId(null);
                                                                        setConfirmingDeleteId(null);
                                                                        onDelete(inv);
                                                                    }}
                                                                    className="flex-1 rounded-lg bg-red-600 py-1 text-[10px] font-black text-white hover:bg-red-700 cursor-pointer"
                                                                >
                                                                    Remover
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(null); }}
                                                                    className="flex-1 rounded-lg bg-slate-100 py-1 text-[10px] font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmingDeleteId(inv.id);
                                                            }}
                                                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
                                                        >
                                                            <i className="bi bi-trash3 text-sm" aria-hidden="true" />
                                                            Remover NF de entrada
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

            {/* Cards para telas menores que MD (< 768px) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {invoices.map((inv) => {
                    const isCardMenuOpen = openMenuId === inv.id;
                    const isSummaryOnly = (!inv.items || inv.items.length === 0) && Boolean(inv.rawXml?.includes('<resNFe'));
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
                                <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                    {isSummaryOnly ? (
                                        <>
                                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40">
                                                NOVA • SEFAZ
                                            </span>
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40">
                                                XML PENDENTE
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            {inv.status === 'received' ? (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                    Recebida
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                                    Disponível
                                                </span>
                                            )}

                                            {inv.items && inv.items.length > 0 && inv.items.every((item) => Boolean(item.matchedProductId)) ? (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                    Vinculação Completa
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                                    Vinculações Pendentes
                                                </span>
                                            )}
                                        </>
                                    )}

                                    <div className="relative inline-block text-left" ref={openMenuId === inv.id ? mobileMenuRef : null}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === inv.id ? null : inv.id);
                                            }}
                                            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                                            title="Mais opções"
                                            aria-label="Mais opções"
                                            aria-haspopup="true"
                                            aria-expanded={isCardMenuOpen}
                                        >
                                            <i className="bi bi-three-dots-vertical text-sm" aria-hidden="true" />
                                        </button>

                                        {openMenuId === inv.id && (
                                            <div
                                                role="menu"
                                                aria-label="Opções da nota fiscal"
                                                className="absolute right-0 z-[100] mt-1 w-48 rounded-2xl border border-slate-100 bg-white py-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95"
                                            >
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(null);
                                                        onManageMappings(inv);
                                                    }}
                                                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                                >
                                                    <i className="bi bi-link-45deg text-blue-600 text-sm" aria-hidden="true" />
                                                    Gerenciar vínculos
                                                </button>

                                                {inv.rawXml && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            onDownloadXml(inv);
                                                        }}
                                                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                                    >
                                                        <i className="bi bi-download text-slate-400 text-sm" aria-hidden="true" />
                                                        Baixar XML
                                                    </button>
                                                )}

                                                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                                                {confirmingDeleteId === inv.id ? (
                                                    <div className="px-4 py-2 space-y-1.5">
                                                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400">Confirmar remoção?</p>
                                                        <p className="text-[9px] text-slate-400">Recebimentos e vínculos não são afetados.</p>
                                                        <div className="flex gap-2 pt-0.5">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(null);
                                                                    setConfirmingDeleteId(null);
                                                                    onDelete(inv);
                                                                }}
                                                                className="flex-1 rounded-lg bg-red-600 py-1 text-[10px] font-black text-white hover:bg-red-700 cursor-pointer"
                                                            >
                                                                Remover
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(null); }}
                                                                className="flex-1 rounded-lg bg-slate-100 py-1 text-[10px] font-black text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmingDeleteId(inv.id);
                                                        }}
                                                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
                                                    >
                                                        <i className="bi bi-trash3 text-sm" aria-hidden="true" />
                                                        Remover NF de entrada
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
                                <span className="text-slate-400">
                                    {isSummaryOnly ? '— itens' : `${inv.itemsCount || inv.items.length} itens`}
                                </span>
                                <div className="flex items-center gap-2">
                                    {isSummaryOnly && onFetchXml && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onFetchXml(inv);
                                            }}
                                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                                        >
                                            <i className="bi bi-cloud-arrow-down-fill text-[10px]" />
                                            Obter XML
                                        </button>
                                    )}
                                    <span className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.totalInvoice)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InboundInvoicesTable;
