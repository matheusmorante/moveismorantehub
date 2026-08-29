import React, { useState, useEffect } from "react";
import InventoryMove from "../../../types/inventoryMove.type";
import { updateInventoryMove } from "@/pages/utils/inventoryService";
import { toast } from "react-toastify";

interface InventoryMoveEditModalProps {
    move: InventoryMove | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function InventoryMoveEditModal({ move, isOpen, onClose, onSuccess }: InventoryMoveEditModalProps) {
    const [type, setType] = useState<'entry' | 'withdrawal' | 'balance'>('entry');
    const [quantity, setQuantity] = useState<number>(0);
    const [date, setDate] = useState<string>('');
    const [observation, setObservation] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (move && isOpen) {
            setType(move.type === 'adjustment' ? 'balance' : move.type);
            setQuantity(move.quantity || 0);
            setDate(move.date ? move.date.substring(0, 10) : new Date().toISOString().substring(0, 10));
            setObservation(move.observation || move.label || '');
        }
    }, [move, isOpen]);

    if (!isOpen || !move) return null;

    const handleSave = async () => {
        if (type !== 'balance' && quantity <= 0) {
            toast.error("Por favor, informe uma quantidade maior que zero.");
            return;
        }

        if (type === 'balance' && quantity === 0) {
            toast.error("O valor do ajuste não pode ser zero.");
            return;
        }

        if (!observation.trim()) {
            toast.error("Por favor, informe um motivo ou observação.");
            return;
        }

        setIsSaving(true);
        try {
            await updateInventoryMove(move.id, {
                type,
                quantity,
                date: date ? new Date(date + 'T12:00:00Z').toISOString() : new Date().toISOString(),
                label: observation.trim(),
                observation: observation.trim()
            });

            toast.success("Movimentação atualizada com sucesso!");
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error("Erro ao atualizar movimentação:", error);
            toast.error(error?.message || "Não foi possível atualizar a movimentação.");
        } finally {
            setIsSaving(false);
        }
    };

    const theme = type === 'entry'
        ? { header: 'bg-emerald-600', confirm: 'bg-emerald-600 hover:bg-emerald-700' }
        : type === 'withdrawal'
            ? { header: 'bg-red-600', confirm: 'bg-red-600 hover:bg-red-700' }
            : { header: 'bg-amber-500', confirm: 'bg-amber-500 hover:bg-amber-600' };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            
            <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-slide-up dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 text-white ${theme.header}`}>
                    <div className="flex items-center gap-2">
                        <i className="bi bi-pencil-square text-lg" />
                        <h2 className="text-sm font-black uppercase tracking-wider">Editar Movimentação</h2>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-white/10 cursor-pointer">
                        <i className="bi bi-x-lg text-base" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Detalhes do Produto */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                            {move.productName || move.productDescription || 'Produto'}
                        </p>
                    </div>

                    {/* Tipo */}
                    <div className="grid grid-cols-3 gap-2">
                        {(['entry', 'withdrawal', 'balance'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                                    type === t
                                        ? t === 'entry'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-900/20'
                                            : t === 'withdrawal'
                                                ? 'bg-red-50 border-red-500 text-red-600 dark:bg-red-900/20'
                                                : 'bg-amber-50 border-amber-500 text-amber-600 dark:bg-amber-900/20'
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                                }`}
                            >
                                {t === 'entry' ? (
                                    <i className="bi bi-box-arrow-up text-sm"></i>
                                ) : t === 'withdrawal' ? (
                                    <i className="bi bi-box-arrow-down text-sm"></i>
                                ) : (
                                    <span className="inline-flex items-center gap-0.5">
                                        <i className="bi bi-box-seam text-sm"></i>
                                        <i className="bi bi-wrench text-[10px]"></i>
                                    </span>
                                )}
                                <span className="text-[9px] font-black uppercase tracking-wider">
                                    {t === 'entry' ? 'Entrada' : t === 'withdrawal' ? 'Saída' : 'Ajuste'}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Quantidade */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {type === 'balance' ? 'Valor do Ajuste (+ ou -)' : 'Quantidade'}
                            </label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-black text-base text-slate-800 dark:text-slate-100"
                            />
                        </div>

                        {/* Data */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-xs text-slate-800 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    {/* Motivo / Observação */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo / Observação *</label>
                        <input
                            type="text"
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            placeholder="Descreva o motivo da movimentação..."
                            className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-xs text-slate-800 dark:text-slate-100"
                        />
                    </div>

                    {/* Ações */}
                    <div className="pt-2 flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${theme.confirm}`}
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
