import React from 'react';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { ReceiptsTableRow } from './ReceiptsTableRow';

export interface ReceiptsTableProps {
    readonly receipts: readonly GoodsReceipt[];
    readonly openMenuId: string | null;
    readonly setOpenMenuId: (id: string | null) => void;
    readonly onRowClick: (receipt: GoodsReceipt) => void;
    readonly onOpenDetails: (receipt: GoodsReceipt) => void;
    readonly onOpenEdit: (receipt: GoodsReceipt) => void;
    readonly onCopyReceipt: (receipt: GoodsReceipt) => void;
    readonly onReverseRequest: (e: React.MouseEvent, receipt: GoodsReceipt) => void;
    readonly onUnreverseRequest?: (e: React.MouseEvent, receipt: GoodsReceipt) => void;
    readonly onDelete: (e: React.MouseEvent, id: string) => void;
}

/**
 * Tabela detalhada de recebimentos de estoque para telas grandes (desktop / ultrawide).
 * Coesa, declarativa e modularizada (alvo < 100 linhas).
 */
export const ReceiptsTable: React.FC<ReceiptsTableProps> = ({
    receipts,
    openMenuId,
    setOpenMenuId,
    onRowClick,
    onOpenDetails,
    onOpenEdit,
    onCopyReceipt,
    onReverseRequest,
    onUnreverseRequest,
    onDelete,
}) => {
    return (
        <div className="hidden xl:block overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-955/30">
                        <th scope="col" className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recebimento</th>
                        <th scope="col" className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        <th scope="col" className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor</th>
                        <th scope="col" className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                        <th scope="col" className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nota Fiscal</th>
                        <th scope="col" className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total recebido</th>
                        <th scope="col" className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {receipts.map((receipt) => (
                        <ReceiptsTableRow
                            key={receipt.id}
                            receipt={receipt}
                            isMenuOpen={openMenuId === receipt.id}
                            onToggleMenu={setOpenMenuId}
                            onRowClick={onRowClick}
                            onOpenDetails={onOpenDetails}
                            onOpenEdit={onOpenEdit}
                            onCopyReceipt={onCopyReceipt}
                            onReverseRequest={onReverseRequest}
                            onUnreverseRequest={onUnreverseRequest}
                            onDelete={onDelete}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ReceiptsTable;
