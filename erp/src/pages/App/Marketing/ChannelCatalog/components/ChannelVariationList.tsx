import React from 'react';
import { VariationRow } from '../types';
import { ChannelVariationCard } from './ChannelVariationCard';

interface ChannelVariationListProps {
    loading: boolean;
    rows: VariationRow[];
    actionLoading: string | null;
    onToggleWhatsAppSync: (row: VariationRow) => void;
    onToggleAutoSync: (row: VariationRow) => void;
}

export const ChannelVariationList: React.FC<ChannelVariationListProps> = ({
    loading,
    rows,
    actionLoading,
    onToggleWhatsAppSync,
    onToggleAutoSync,
}) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Carregando Variações...
                </p>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                <i className="bi bi-layers text-4xl text-slate-200 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Nenhuma variação encontrada
                </p>
                <p className="text-[9px] text-slate-400 mt-1">
                    Apenas produtos com variações aparecem aqui
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3">
            {rows.map(row => (
                <ChannelVariationCard
                    key={row.varId}
                    row={row}
                    actionLoading={actionLoading}
                    onToggleWhatsAppSync={onToggleWhatsAppSync}
                    onToggleAutoSync={onToggleAutoSync}
                />
            ))}
        </div>
    );
};
