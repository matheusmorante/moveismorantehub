import React from 'react';
import Order from '@/pages/types/order.type';
import Item from '@/pages/types/items.type';
import { NfeItemRow } from './NfeItemRow';

export interface NfeItemFiscal {
    ncm: string;
    cest?: string;
    cfop: string;
    cst: string;
    origem: string;
}

export interface NfeItemWithFiscal extends Item {
    fiscal: NfeItemFiscal;
    isUnregistered: boolean;
}

interface Props {
    order: Order;
    items: NfeItemWithFiscal[];
    onUpdateItemFiscal: (index: number, fiscalUpdates: Partial<NfeItemFiscal>) => void;
    onBatchUpdateItems: (updated: NfeItemWithFiscal[]) => void;
}

export const NfeItemsSection: React.FC<Props> = ({
    items,
    onUpdateItemFiscal,
}) => {
    // Contadores informativos
    const unregisteredCount = items.filter(i => i.isUnregistered).length;

    return (
        <div className="flex flex-col gap-3">
            {/* Barra superior de controle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-black">
                        <i className="bi bi-boxes" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Itens da Venda para a Nota Fiscal
                        </h4>
                        <p className="text-[11px] text-slate-400">
                            {items.length} produto(s) • {unregisteredCount > 0 ? `${unregisteredCount} não cadastrado(s) no ERP` : 'Todos vinculados ao ERP'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Lista dos Itens da Venda */}
            <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {items.map((item, index) => (
                    <NfeItemRow
                        key={`${item.productId || 'item'}_${index}`}
                        item={item}
                        onUpdateFiscal={(field, val) => onUpdateItemFiscal(index, { [field]: val })}
                    />
                ))}
            </div>
        </div>
    );
};
