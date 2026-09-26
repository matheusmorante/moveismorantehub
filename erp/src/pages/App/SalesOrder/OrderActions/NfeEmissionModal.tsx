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
        isLoadingFiscalData,
        emissionResult,
        nfeItems,
        handleUpdateItemFiscal,
        handleBatchUpdateItems,
        handleSuggestNcm,
        handleAcceptNcmSuggestion,
        handleRejectNcmSuggestion,
        suggestingNcmIndex,
        handleEmit,
        handlePrintDanfe
    } = useNfeEmission(order, onSuccess);
    const [productionConfirmed, setProductionConfirmed] = React.useState(false);
    React.useEffect(() => setProductionConfirmed(false), [environment]);

    if (!isOpen || !order) return null;

    const isPickup = order.shipping?.deliveryMethod === 'pickup';
    const modelLabel = isPickup ? 'NFC-e · modelo 65 · retirada' : 'NF-e · modelo 55 · entrega';

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
                                Emitir nota fiscal de saída
                            </h3>
                            <p className="text-xs text-slate-400">
                                Pedido #{order.orderIndex || order.id} • {modelLabel}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <i className="bi bi-x-lg text-sm" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                    {environment === 2 ? (
                        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
                            <i className="bi bi-shield-exclamation mt-0.5 shrink-0 text-xl text-amber-600 dark:text-amber-400" />
                            <div>
                                <p className="font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">Homologação · teste sem valor fiscal</p>
                                <p className="mt-1 leading-relaxed text-amber-800 dark:text-amber-200">A SEFAZ receberá este documento no ambiente de testes. Ele não comprova uma venda fiscal em produção.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs dark:border-rose-900/60 dark:bg-rose-950/30">
                            <div className="flex items-start gap-3">
                                <i className="bi bi-exclamation-triangle-fill mt-0.5 shrink-0 text-xl text-rose-600 dark:text-rose-400" />
                                <div>
                                    <p className="font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">Produção · documento fiscal válido</p>
                                    <p className="mt-1 leading-relaxed text-rose-800 dark:text-rose-200">A emissão será transmitida à SEFAZ como documento real. Confira pedido, itens, destinatário e NCM antes de confirmar.</p>
                                </div>
                            </div>
                            <label className="flex cursor-pointer items-start gap-2 font-bold text-rose-900 dark:text-rose-100">
                                <input type="checkbox" checked={productionConfirmed} onChange={event => setProductionConfirmed(event.target.checked)} className="mt-0.5 accent-rose-600" />
                                <span>Confirmo que quero transmitir esta nota em Produção.</span>
                            </label>
                        </div>
                    )}

                    {/* Resumo do Pedido */}
                    <NfeOrderSummary order={order} />

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dados adicionais do destinatário</h4>
                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">Os dados vêm do snapshot deste pedido e não serão alterados pela emissão.</p>
                        {order.shipping?.deliveryMethod !== 'pickup' && (
                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                Endereço: {order.shipping?.deliveryAddress?.street || order.customerData?.fullAddress?.street || 'Não informado'}
                                {order.shipping?.deliveryAddress?.number ? `, ${order.shipping.deliveryAddress.number}` : ''}
                            </p>
                        )}
                    </section>

                    {/* Lista de Itens com Campos Fiscais e IA para NCM */}
                    {!emissionResult?.success && (
                        <NfeItemsSection
                            order={order}
                            items={nfeItems}
                            onUpdateItemFiscal={handleUpdateItemFiscal}
                            onBatchUpdateItems={handleBatchUpdateItems}
                            onSuggestNcm={handleSuggestNcm}
                            onAcceptNcmSuggestion={handleAcceptNcmSuggestion}
                            onRejectNcmSuggestion={handleRejectNcmSuggestion}
                            suggestingNcmIndex={suggestingNcmIndex}
                        />
                    )}

                    {/* Seleção de Ambiente */}
                    <NfeEnvironmentSelector environment={environment} onSelect={setEnvironment} />

                    {isLoadingFiscalData && (
                        <div role="status" className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <i className="bi bi-arrow-repeat animate-spin" /> Carregando NCMs e dados fiscais dos produtos…
                        </div>
                    )}

                    {emissionResult && !emissionResult.success && (
                        <div role="alert" className={`rounded-2xl border p-4 text-xs ${emissionResult.pending ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'}`}>
                            <p className="font-black">{emissionResult.pending ? 'Emissão pendente de confirmação' : 'Não foi possível autorizar a nota'}</p>
                            <p className="mt-1">{emissionResult.error}</p>
                            {emissionResult.cStat && <p className="mt-1 font-mono">SEFAZ cStat {emissionResult.cStat}{emissionResult.sefazMessage ? ` · ${emissionResult.sefazMessage}` : ''}</p>}
                            {emissionResult.validation?.errors.map(error => <p key={error} className="mt-1">• {error}</p>)}
                            {emissionResult.pending && <p className="mt-2 font-semibold">Consulte a situação do documento antes de tentar novamente para evitar duplicidade.</p>}
                        </div>
                    )}

                    {emissionResult?.validation?.warnings?.length ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                            {emissionResult.validation.warnings.map(warning => <p key={warning}>• {warning}</p>)}
                        </div>
                    ) : null}

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
                            onClick={() => handleEmit(productionConfirmed)}
                            disabled={isSubmitting || isLoadingFiscalData || (environment === 1 && !productionConfirmed)}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Transmitindo {environment === 1 ? 'em Produção' : 'em Homologação'}…</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-cloud-arrow-up-fill" />
                                    <span>Emitir {isPickup ? 'NFC-e' : 'NF-e'} em {environment === 1 ? 'Produção' : 'Homologação'}</span>
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
