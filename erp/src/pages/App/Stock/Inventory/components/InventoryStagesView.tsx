import React, { useMemo, useState, useEffect } from 'react';
import type { AuditItem } from "../modals/InventoryAuditModal";
import { ActionConfirmModal } from '../modals/ActionConfirmModal';

interface Stage {
    supplierName: string;
    total: number;
    counted: number;
    status: 'not_started' | 'in_progress' | 'completed';
}

interface InventoryStagesViewProps {
    readonly items: AuditItem[];
    readonly onSelectStage: (supplierName: string) => void;
    readonly onCancel?: () => void;
    readonly hasChanges?: boolean;
}

export const InventoryStagesView: React.FC<InventoryStagesViewProps> = ({ items, onSelectStage, onCancel, hasChanges }) => {
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [canConfirmCancel, setCanConfirmCancel] = useState(false);

    useEffect(() => {
        if (showCancelConfirm) {
            setCanConfirmCancel(false);
            const timer = setTimeout(() => {
                setCanConfirmCancel(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showCancelConfirm]);

    const handleCancelClick = () => {
        if (!hasChanges) {
            onCancel?.();
        } else {
            setShowCancelConfirm(true);
        }
    };

    const { stages, totalItems, totalCounted, progressPercent } = useMemo(() => {
        const stageMap = new Map<string, Stage>();
        
        for (const item of items) {
            const supplier = item.assignedSupplier || 'Sem fornecedor';
            if (!stageMap.has(supplier)) {
                stageMap.set(supplier, { supplierName: supplier, total: 0, counted: 0, status: 'not_started' });
            }
            const stage = stageMap.get(supplier)!;
            stage.total++;
            if (item.physicalCount !== null) {
                stage.counted++;
            }
        }
        
        let counted = 0;
        let total = items.length;
        
        const stagesArray = Array.from(stageMap.values()).map(stage => {
            counted += stage.counted;
            if (stage.counted === 0) stage.status = 'not_started';
            else if (stage.counted === stage.total) stage.status = 'completed';
            else stage.status = 'in_progress';
            return stage;
        });

        // Sort: Suppliers alphabetically. Filter out 'Sem fornecedor' per user request.
        const filteredStagesArray = stagesArray.filter(stage => stage.supplierName !== 'Sem fornecedor');
        filteredStagesArray.sort((a, b) => {
            return a.supplierName.localeCompare(b.supplierName);
        });
        
        const progress = total > 0 ? Math.round((counted / total) * 100) : 0;
        
        return { stages: filteredStagesArray, totalItems: total, totalCounted: counted, progressPercent: progress };
    }, [items]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {onCancel && (
                <div className="flex justify-end">
                    <button
                        onClick={handleCancelClick}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 font-bold rounded-xl transition-colors text-sm"
                    >
                        <i className="bi bi-arrow-left"></i>
                        Voltar
                    </button>
                </div>
            )}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Progresso Geral</h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                            <strong className="text-slate-700 dark:text-slate-300">{totalCounted}</strong> de {totalItems} itens contados
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{progressPercent}%</div>
                    </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden">
                    <div 
                        className="bg-emerald-500 h-3 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>
            
            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Etapas por Fornecedor ({stages.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stages.map(stage => {
                        const stagePercent = stage.total > 0 ? Math.round((stage.counted / stage.total) * 100) : 0;
                        const pending = stage.total - stage.counted;
                        
                        return (
                            <button
                                key={stage.supplierName}
                                onClick={() => onSelectStage(stage.supplierName)}
                                className="group flex flex-col text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-all"
                            >
                                <div className="flex items-start justify-between mb-4 w-full">
                                    <div className="font-black text-lg text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight">
                                        {stage.supplierName}
                                    </div>
                                    {stage.status === 'completed' && (
                                        <i className="bi bi-check-circle-fill text-emerald-500 text-2xl shrink-0"></i>
                                    )}
                                </div>
                                
                                <div className="mt-auto w-full">
                                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                                        <strong className="text-slate-700 dark:text-slate-300">{stage.counted}</strong> / {stage.total} itens
                                        {pending > 0 && <span className="block text-amber-600 dark:text-amber-500 mt-1">{pending} pendentes</span>}
                                        {pending === 0 && <span className="block text-emerald-600 dark:text-emerald-500 mt-1">Concluído</span>}
                                    </div>
                                    
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className="bg-emerald-500 h-2 rounded-full transition-all" 
                                                style={{ width: `${stagePercent}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 min-w-[32px] text-right">{stagePercent}%</span>
                                    </div>
                                    
                                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center w-full">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${stage.status === 'not_started' ? 'text-slate-400' : stage.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {stage.status === 'not_started' ? 'Não iniciado' : stage.status === 'completed' ? 'Finalizado' : 'Em andamento'}
                                        </span>
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                                            {stage.status === 'completed' ? 'Revisar' : stage.status === 'not_started' ? 'Iniciar' : 'Continuar'}
                                            <i className="bi bi-chevron-right ml-1"></i>
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {showCancelConfirm && (
                <ActionConfirmModal
                    title="Cancelar Inventário"
                    description="O inventário possui alterações. Ao cancelar, tudo o que foi feito será desfeito e excluído. Tem certeza que deseja cancelar?"
                    confirmText={canConfirmCancel ? "Sim, Cancelar" : "Aguarde..."}
                    onConfirm={() => {
                        setShowCancelConfirm(false);
                        onCancel?.();
                    }}
                    onCancel={() => setShowCancelConfirm(false)}
                    isDestructive={true}
                    confirmDisabled={!canConfirmCancel}
                />
            )}
        </div>
    );
};
