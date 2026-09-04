import React from "react";
import Order from "@/pages/types/order.type";
import { NfeOrderSummary } from "./nfe-modal/NfeOrderSummary";
import { NfeEnvironmentSelector } from "./nfe-modal/NfeEnvironmentSelector";
import { NfeItemsSection } from "./nfe-modal/NfeItemsSection";
import { NfeSuccessCard } from "./nfe-modal/NfeSuccessCard";
import { useNfeEmission } from "./nfe-modal/useNfeEmission";

interface NfeEmissionModalProps {
    isOpen: boolean;
    order: Order | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export const NfeEmissionModal: React.FC<NfeEmissionModalProps> = ({
    isOpen,
    order,
    onClose,
    onSuccess
}) => {
    const {
        environment,
        setEnvironment,
        isSubmitting,
        emissionResult,
        nfeItems,
        handleUpdateItemFiscal,
        handleBatchUpdateItems,
        handleEmit,
        handlePrintDanfe
    } = useNfeEmission(order, onSuccess);

    if (!isOpen || !order) return null;

    const isPickup = order.shipping?.deliveryMethod === 'pickup';
    const defaultModel = isPickup ? '65 (NFC-e - Retirada)' : '55 (NF-e - Entrega)';

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <i className="bi bi-receipt-cutoff text-lg" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                                Emissão Fiscal SEFAZ-PR
                            </h3>
                            <p className="text-xs text-slate-400">
                                Pedido #{order.orderIndex || order.id} • Modelo {defaultModel}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <i className="bi bi-x-lg text-sm" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                    {/* Tarja de Homologação */}
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                        <i className="bi bi-shield-exclamation text-amber-600 dark:text-amber-400 text-xl shrink-0 mt-0.5" />
                        <div className="text-xs">
                            <p className="font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                                Ambiente de Testes / Homologação (Sem valor fiscal)
                            </p>
                            <p className="text-amber-700 dark:text-amber-400/90 mt-0.5 leading-relaxed">
                                As notas fiscais emitidas aqui são validadas de acordo com as regras oficiais do SEFAZ-PR Layout 4.00, permitindo testar cálculos, XML e impressão do DANFE.
                            </p>
                        </div>
                    </div>

                    {/* Resumo do Pedido */}
                    <NfeOrderSummary order={order} />

                    {/* Lista de Itens com Campos Fiscais e IA para NCM */}
                    {!emissionResult?.success && (
                        <NfeItemsSection
                            order={order}
                            items={nfeItems}
                            onUpdateItemFiscal={handleUpdateItemFiscal}
                            onBatchUpdateItems={handleBatchUpdateItems}
                        />
                    )}

                    {/* Seleção de Ambiente */}
                    <NfeEnvironmentSelector environment={environment} onSelect={setEnvironment} />

                    {/* Resultado da Emissão */}
                    {emissionResult?.success && (
                        <NfeSuccessCard result={emissionResult} onPrintDanfe={handlePrintDanfe} />
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Fechar
                    </button>

                    {!emissionResult?.success ? (
                        <button
                            type="button"
                            onClick={handleEmit}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Emitindo Teste...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-cloud-arrow-up-fill" />
                                    <span>Emitir NF-e (Homologação)</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handlePrintDanfe}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
                        >
                            <i className="bi bi-printer-fill" />
                            <span>Imprimir DANFE</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NfeEmissionModal;
