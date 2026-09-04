import React, { useState } from 'react';
import { NfeItemWithFiscal, NfeItemFiscal } from './NfeItemsSection';
import { formatCurrency } from '@/pages/utils/formatters';
import { NcmSelect } from './NcmSelect';
import { CFOP_OPTIONS, CSOSN_OPTIONS, ORIGEM_OPTIONS, CEST_OPTIONS } from '@/pages/utils/nfe/fiscalConstants';

interface Props {
    item: NfeItemWithFiscal;
    onUpdateFiscal: (field: keyof NfeItemFiscal, value: string) => void;
}

export const NfeItemRow: React.FC<Props> = ({
    item,
    onUpdateFiscal
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const itemTotal = (item.quantity || 1) * (item.unitPrice || 0) - ((item.unitDiscount || 0) * (item.quantity || 1));
    const cleanNcm = (item.fiscal?.ncm || '').replace(/\D/g, '');
    const isNcmValid = cleanNcm.length === 8;

    return (
        <div className={`p-3 rounded-2xl border transition-all ${
            item.isUnregistered
                ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-900/40'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }`}>
            {/* Linha Principal do Item */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                                {item.description || 'Produto sem descrição'}
                            </p>
                            {item.isUnregistered ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
                                    Não Cadastrado no ERP
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    Cadastrado no ERP
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Qtd: <span className="font-bold text-slate-600 dark:text-slate-300">{item.quantity} UN</span> • Preço Un: <span className="font-bold text-slate-600 dark:text-slate-300">{formatCurrency(item.unitPrice || 0)}</span> • Total: <span className="font-black text-slate-700 dark:text-slate-200">{formatCurrency(itemTotal)}</span>
                        </p>
                    </div>
                </div>

                {/* Campos Fiscais Rápidos (NCM via Select/Pesquisa) */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <div className="flex items-center gap-1.5 min-w-[170px] sm:min-w-[190px]">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">NCM:</label>
                        <NcmSelect
                            value={item.fiscal?.ncm || ''}
                            onChange={(val) => onUpdateFiscal('ncm', val)}
                        />
                    </div>

                    {/* Botão de Expandir Campos Fiscais Avançados */}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(prev => !prev)}
                        className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                            isExpanded ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                        }`}
                        title="Ver / editar CFOP, CSOSN/CST, Origem e CEST"
                    >
                        <i className="bi bi-chevron-down text-xs" />
                    </button>
                </div>
            </div>

            {/* Campos Tributários Avançados (Sanfona Expansível com Selects) */}
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 animate-in fade-in duration-150">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">CFOP *</label>
                        <select
                            value={item.fiscal?.cfop || '5102'}
                            onChange={(e) => onUpdateFiscal('cfop', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
                        >
                            {CFOP_OPTIONS.map(cf => (
                                <option key={cf.value} value={cf.value}>{cf.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">CSOSN / CST *</label>
                        <select
                            value={item.fiscal?.cst || '102'}
                            onChange={(e) => onUpdateFiscal('cst', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
                        >
                            {CSOSN_OPTIONS.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Origem *</label>
                        <select
                            value={item.fiscal?.origem || '0'}
                            onChange={(e) => onUpdateFiscal('origem', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
                        >
                            {ORIGEM_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">CEST</label>
                        <select
                            value={item.fiscal?.cest || ''}
                            onChange={(e) => onUpdateFiscal('cest', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
                        >
                            {CEST_OPTIONS.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};
