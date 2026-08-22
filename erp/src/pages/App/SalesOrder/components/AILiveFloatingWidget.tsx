import React from "react";

interface AILiveFloatingWidgetProps {
    isListening: boolean;
    isPaused: boolean;
    liveTranscript: string;
    accumulatedText: string;
    isProcessingAI: boolean;
    lastUpdatedInfo?: string;
    onTogglePause: () => void;
    onStopLive: () => void;
    onOpenFullModal: () => void;
}

export const AILiveFloatingWidget: React.FC<AILiveFloatingWidgetProps> = ({
    isListening,
    isPaused,
    liveTranscript,
    accumulatedText,
    isProcessingAI,
    lastUpdatedInfo,
    onTogglePause,
    onStopLive,
    onOpenFullModal
}) => {
    if (!isListening && !isProcessingAI && !lastUpdatedInfo) return null;

    const displayText = liveTranscript || accumulatedText.slice(-110) || "Fale os dados do pedido (cliente, vendedor, produtos, pagamentos)...";

    return (
        <div className="fixed bottom-6 right-6 z-[160] max-w-md w-[calc(100vw-3rem)] animate-slide-up">
            <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-4 rounded-3xl shadow-2xl border border-violet-500/50 backdrop-blur-xl flex flex-col gap-3">
                {/* Cabeçalho do Widget Flutuante */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                        {isPaused ? (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-black uppercase text-amber-400">
                                <i className="bi bi-pause-circle-fill text-xs" /> ESCUTA PAUSADA
                            </span>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                                    IA LIVE · Voz Ativa
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Botão de Pausar / Retomar Escuta */}
                        <button
                            type="button"
                            onClick={onTogglePause}
                            className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                                isPaused
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                                : 'bg-amber-600/30 hover:bg-amber-600 border border-amber-500/40 text-amber-300 hover:text-white'
                            }`}
                            title={isPaused ? "Retomar escuta de voz" : "Pausar escuta para não gravar conversas externas"}
                        >
                            <i className={`bi ${isPaused ? 'bi-play-fill text-xs' : 'bi-pause-fill text-xs'}`} />
                            {isPaused ? 'Retomar Escuta' : 'Pausar Escuta'}
                        </button>

                        <button
                            type="button"
                            onClick={onOpenFullModal}
                            className="px-2.5 py-1 rounded-xl bg-violet-600/30 hover:bg-violet-600 border border-violet-500/40 text-[9px] font-black uppercase tracking-wider text-violet-300 hover:text-white transition-all"
                            title="Reabrir modal completo da IA"
                        >
                            <i className="bi bi-arrows-angle-expand text-xs" />
                        </button>

                        <button
                            type="button"
                            onClick={onStopLive}
                            className="w-7 h-7 flex items-center justify-center bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl transition-all"
                            title="Encerrar Live de Voz"
                        >
                            <i className="bi bi-square-fill text-[10px]" />
                        </button>
                    </div>
                </div>

                {/* Transcrição da Fala ao Vivo */}
                <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-blue-500 flex items-center justify-center shrink-0 shadow-md">
                        <i className={`bi ${isProcessingAI ? 'bi-arrow-repeat animate-spin text-white' : 'bi-stars text-white'} text-sm`} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            {isPaused ? (
                                <span className="text-amber-400">Microfone em pausa</span>
                            ) : isProcessingAI ? (
                                <span className="text-violet-400 animate-pulse">✨ IA analisando e preenchendo campos...</span>
                            ) : (
                                <span>Ouvindo sua voz ao vivo:</span>
                            )}
                        </span>
                        <p className={`text-xs font-semibold truncate line-clamp-2 mt-0.5 ${isPaused ? 'text-slate-400 italic' : 'text-slate-100'}`}>
                            "{displayText}"
                        </p>
                    </div>
                </div>

                {/* Status do Preenchimento Automático nos Campos */}
                {lastUpdatedInfo && (
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-[10px] font-bold flex items-center gap-2 animate-fade-in shadow-sm">
                        <i className="bi bi-check-circle-fill text-emerald-400 text-xs" />
                        <span>{lastUpdatedInfo}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AILiveFloatingWidget;
