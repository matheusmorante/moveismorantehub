import React, { useState, useEffect, useMemo } from "react";
import Product, { Variation } from "../../../types/product.type";
import { saveInventoryMove, subscribeToInventoryMoves } from '@/pages/utils/inventoryService';
import { toast } from "react-toastify";
import InventoryMove from "../../../types/inventoryMove.type";
import { calculateInventoryTimelineBalance } from "@/pages/utils/inventoryTimelineBalance";

interface StockLaunchModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetProduct: Product | null;
    targetVariation?: Variation;
    currentStock?: number;
}

type LaunchType = 'entry' | 'exit' | 'adjustment';

const StockLaunchModal = ({ 
    isOpen, 
    onClose, 
    targetProduct, 
    targetVariation,
    currentStock: propCurrentStock 
}: StockLaunchModalProps) => {
    const [type, setType] = useState<LaunchType>('entry');
    const [quantity, setQuantity] = useState<number>(0);
    const [newDesiredStock, setNewDesiredStock] = useState<string>('');
    const [reason, setReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [moves, setMoves] = useState<InventoryMove[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        return subscribeToInventoryMoves(setMoves);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setQuantity(0);
            setNewDesiredStock('');
            setReason("");
            setType('entry');
        }
    }, [isOpen]);

    const activeVariation = targetVariation || targetProduct?.variations?.[0];
    const productName = targetProduct?.name || targetProduct?.title || targetProduct?.description || "Produto";
    const variationName = activeVariation?.name || (activeVariation as any)?.displayName || "";
    
    // Calcula o saldo dinamicamente a partir das movimentações reais
    const currentStock = useMemo(() => {
        if (!targetProduct) return 0;

        const targetVarId = activeVariation?.id;
        const relevantMoves = moves.filter(m => {
            if (m.status === 'cancelled') return false;
            if (m.productId !== targetProduct.id) return false;
            if (targetVarId && m.variationId) {
                return String(m.variationId) === String(targetVarId);
            }
            return true;
        });

        const timelineBalance = calculateInventoryTimelineBalance(relevantMoves);
        if (timelineBalance !== null) return timelineBalance;

        if (propCurrentStock !== undefined) return propCurrentStock;
        return Number(activeVariation?.stock !== undefined ? activeVariation.stock : (targetProduct.stock || 0));
    }, [targetProduct, activeVariation, propCurrentStock, moves]);

    if (!isOpen || !targetProduct) return null;

    const fullDisplayName = variationName && variationName.trim() ? variationName.trim() : productName;

    const adjustmentDiff = newDesiredStock !== '' ? Number(newDesiredStock) - currentStock : 0;

    const handleSave = async () => {
        let moveQuantity = quantity;

        if (type === 'adjustment') {
            if (newDesiredStock === '') {
                toast.error("Por favor, informe o novo saldo do produto.");
                return;
            }
            moveQuantity = Number(newDesiredStock) - currentStock;
            if (moveQuantity === 0) {
                toast.error("O novo saldo informado é idêntico ao saldo atual.");
                return;
            }
        } else {
            if (quantity <= 0) {
                toast.error("Por favor, informe uma quantidade maior que zero.");
                return;
            }
        }

        if (!reason.trim()) {
            toast.error("Por favor, declare o motivo da movimentação.");
            return;
        }

        setIsSaving(true);
        try {
            const move: InventoryMove = {
                productId: targetProduct.id!,
                variationId: activeVariation?.id || targetProduct.id!,
                productDescription: fullDisplayName,
                type: type === 'adjustment' ? 'balance' : (type === 'entry' ? 'entry' : 'withdrawal'),
                quantity: moveQuantity,
                date: new Date().toISOString(),
                label: reason.trim(),
                observation: reason.trim()
            };

            await saveInventoryMove(move, currentStock);
            
            toast.success("Movimentação registrada com sucesso! ✨");
            onClose();
            setQuantity(0);
            setNewDesiredStock('');
            setReason("");
        } catch (error) {
            console.error("Erro ao salvar movimentação:", error);
            toast.error("Erro ao salvar lançamento de estoque.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                {/* Header Dinâmico */}
                <div className={`flex items-center justify-between px-8 py-5 transition-colors text-white ${
                    type === 'entry' 
                        ? 'bg-emerald-600' 
                        : type === 'exit' 
                            ? 'bg-rose-600' 
                            : 'bg-amber-500'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                            <i className="bi bi-arrow-left-right text-lg" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider">Nova Movimentação de Estoque</h3>
                            <p className="text-[11px] font-medium text-white/80">
                                {type === 'entry' ? 'Entrada no estoque' : type === 'exit' ? 'Saída do estoque' : 'Ajuste de inventário'}
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Resumo do Produto Selecionado */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 shrink-0">
                                <i className="bi bi-box-seam text-lg" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {fullDisplayName}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium tracking-tight mt-0.5">
                                    Saldo Atual: <span className="font-black text-slate-700 dark:text-slate-200">
                                        {currentStock} {targetProduct.unit || 'UN'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tipo de Movimentação */}
                    <div className="grid grid-cols-3 gap-3">
                        {(['entry', 'exit', 'adjustment'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                                    type === t
                                        ? t === 'entry'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-900/20 shadow-lg shadow-emerald-100 dark:shadow-none'
                                            : t === 'exit'
                                                ? 'bg-red-50 border-red-500 text-red-600 dark:bg-red-900/20 shadow-lg shadow-red-100 dark:shadow-none'
                                                : 'bg-amber-50 border-amber-500 text-amber-600 dark:bg-amber-900/20 shadow-lg shadow-amber-100 dark:shadow-none'
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                                }`}
                            >
                                {t === 'entry' ? (
                                    <i className="bi bi-box-arrow-up text-lg"></i>
                                ) : t === 'exit' ? (
                                    <i className="bi bi-box-arrow-down text-lg"></i>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-lg">
                                        <i className="bi bi-box-seam"></i>
                                        <i className="bi bi-wrench text-xs"></i>
                                    </span>
                                )}
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                    {t === 'entry' ? 'Entrada' : t === 'exit' ? 'Saída' : 'Ajuste'}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Formulário de Quantidade / Novo Saldo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {type === 'adjustment' ? (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Novo Saldo do Produto
                                </label>
                                <input
                                    type="number"
                                    value={newDesiredStock}
                                    onChange={(e) => setNewDesiredStock(e.target.value)}
                                    placeholder={`Saldo atual: ${currentStock}`}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-colors"
                                    autoFocus
                                />
                                {newDesiredStock !== '' && (
                                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1.5">
                                        <span>Ajuste resultante:</span>
                                        <span className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
                                            adjustmentDiff > 0 
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                                : adjustmentDiff < 0 
                                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' 
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {adjustmentDiff > 0 ? `+${adjustmentDiff}` : adjustmentDiff} {targetProduct.unit || 'un'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Quantidade *
                                </label>
                                <input
                                    type="number"
                                    value={quantity || ''}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    placeholder="0"
                                    min="1"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Motivo / Observação *
                            </label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ex: Balanço de estoque, contagem física..."
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-slate-400 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Botão de Confirmação */}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`w-full py-3.5 rounded-xl font-black uppercase tracking-wider text-xs text-white shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                            type === 'entry'
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none'
                                : type === 'exit'
                                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none'
                                    : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none'
                        }`}
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <i className="bi bi-check2 text-base" />
                                <span>Confirmar Movimentação</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockLaunchModal;
