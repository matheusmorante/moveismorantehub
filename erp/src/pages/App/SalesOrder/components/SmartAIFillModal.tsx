import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { aiService } from "@/pages/utils/aiService";

interface SmartAIFillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyData: (data: any) => void;
    onStartLiveMode?: () => void;
    sellerList?: string[];
}

export const SmartAIFillModal: React.FC<SmartAIFillModalProps> = ({
    isOpen,
    onClose,
    onApplyData,
    onStartLiveMode,
    sellerList = []
}) => {
    const [promptText, setPromptText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [lastParsedResult, setLastParsedResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'ai' | 'json_manual'>('ai');
    const [manualJSON, setManualJSON] = useState("");
    const [liveTranscript, setLiveTranscript] = useState("");

    const recognitionRef = useRef<any>(null);

    // Inicialização da Web Speech API para Transcrição de Áudio ao Vivo
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'pt-BR';

            recognition.onresult = (event: any) => {
                let currentInterim = '';
                let currentFinal = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        currentFinal += transcript + ' ';
                    } else {
                        currentInterim += transcript;
                    }
                }

                if (currentFinal) {
                    setPromptText(prev => {
                        const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
                        return prev + spacer + currentFinal;
                    });
                }
                setLiveTranscript(currentInterim);
            };

            recognition.onerror = (event: any) => {
                console.warn("Speech recognition error:", event.error);
                if (event.error !== 'no-speech') {
                    setIsListening(false);
                    toast.warn(`Microfone: ${event.error === 'not-allowed' ? 'Permissão de microfone negada no navegador' : event.error}`);
                }
            };

            recognition.onend = () => {
                setIsListening(false);
                setLiveTranscript("");
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {
                    // ignore
                }
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast.warn("Seu navegador não suporta reconhecimento de voz nativo. Use o Google Chrome ou digite/cole o texto no campo.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setLiveTranscript("");
            toast.info("Gravação de áudio pausada.");
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                toast.success("Ouvindo! Pode ditar os dados do pedido...");
            } catch (err: any) {
                console.error("Erro ao iniciar reconhecimento:", err);
                setIsListening(false);
            }
        }
    };

    const handleGenerateAI = async () => {
        const fullText = (promptText + (liveTranscript ? ` ${liveTranscript}` : "")).trim();
        if (!fullText) {
            toast.warn("Por favor, fale no microfone ou digite o texto do pedido para a IA analisar.");
            return;
        }

        if (isListening && recognitionRef.current) {
            try {
                recognitionRef.current.stop();
                setIsListening(false);
            } catch {}
        }

        setIsProcessingAI(true);
        try {
            const result = await aiService.parseOrderFromFreeText(fullText, sellerList);
            setLastParsedResult(result);
            toast.success("Pedido analisado com sucesso pela IA Gemini!");
        } catch (err: any) {
            console.error("Erro ao processar pedido com IA:", err);
            toast.error(err.message || "Falha ao analisar o pedido com a IA Gemini.");
        } finally {
            setIsProcessingAI(false);
        }
    };

    const handleConfirmApply = () => {
        if (!lastParsedResult?.rawJSON) {
            toast.warn("Gere ou processe o pedido com a IA antes de aplicar.");
            return;
        }
        onApplyData(lastParsedResult.rawJSON);
        onClose();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target?.result as string);
                onApplyData(parsed);
                onClose();
            } catch (err: any) {
                toast.error("Arquivo JSON inválido: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleProcessManualJSON = () => {
        try {
            const parsed = JSON.parse(manualJSON);
            onApplyData(parsed);
            onClose();
        } catch (err: any) {
            toast.error("JSON inválido: " + err.message);
        }
    };

    if (!isOpen) return null;

    const identified = lastParsedResult?.identifiedFields || {};
    const warnings = lastParsedResult?.warnings || [];
    const missing = lastParsedResult?.missingRequiredFields || [];

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header com Gradiente de IA e Estrelas */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-violet-600/10 via-blue-600/10 to-transparent dark:from-violet-950/40 dark:via-blue-950/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
                            <i className="bi bi-stars text-lg animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                    Preenchimento Inteligente IA
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-[9px] font-black uppercase text-white tracking-widest shadow-sm">
                                    Gemini 2.5
                                </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                Fale ao vivo ou digite os dados e a IA estrutura o pedido instantaneamente
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setActiveTab('ai')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    activeTab === 'ai'
                                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <i className="bi bi-stars text-xs" /> IA & Voz
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('json_manual')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    activeTab === 'json_manual'
                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <i className="bi bi-filetype-json text-xs" /> JSON
                            </button>
                        </div>

                        <button 
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                        >
                            <i className="bi bi-x-lg text-sm" />
                        </button>
                    </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar flex flex-col gap-5">
                    {activeTab === 'ai' ? (
                        <>
                            {/* Botão Principal: Live de Áudio ao Vivo */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-indigo-500/10 dark:from-violet-950/30 dark:via-blue-950/20 dark:to-indigo-950/30 border border-violet-200/60 dark:border-violet-800/40">
                                <div className="flex items-center gap-3">
                                    <div className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${
                                        isListening 
                                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/40 animate-pulse' 
                                        : 'bg-gradient-to-tr from-violet-600 to-blue-600 text-white shadow-md shadow-blue-500/20'
                                    }`}>
                                        <i className={`bi ${isListening ? 'bi-mic-fill' : 'bi-mic'} text-xl`} />
                                        {isListening && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                            {isListening ? "Gravando Áudio ao Vivo..." : "Falar ao Vivo com a IA"}
                                            {isListening && (
                                                <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[9px] font-black animate-pulse">
                                                    LIVE
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            {isListening 
                                                ? "Fale normalmente: cliente, endereço, produtos, valores e forma de pagamento." 
                                                : "Clique no botão ao lado para ditar o pedido por voz em tempo real."}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 ${
                                        isListening
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 scale-105'
                                        : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white shadow-lg shadow-violet-600/25 hover:scale-105 active:scale-95'
                                    }`}
                                >
                                    <i className={`bi ${isListening ? 'bi-stop-fill' : 'bi-broadcast'} text-sm`} />
                                    {isListening ? 'Parar Escuta' : 'Iniciar Live de Voz'}
                                </button>
                            </div>

                            {/* Campo de Texto Livre com Transcrição ao Vivo */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                        <i className="bi bi-chat-left-text text-violet-500" /> Texto / Anotações do Pedido:
                                    </label>
                                    {promptText && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPromptText("");
                                                setLiveTranscript("");
                                            }}
                                            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors"
                                        >
                                            Limpar Texto
                                        </button>
                                    )}
                                </div>

                                <div className="relative">
                                    <textarea
                                        value={promptText + (liveTranscript ? ` ${liveTranscript}` : "")}
                                        onChange={(e) => setPromptText(e.target.value)}
                                        placeholder="Exemplo: O cliente é Angelina da Silva, telefone (11) 98765-4321, mora na Rua das Flores 123, comprou um Sofá Retrátil 3 Lugares por 2500 reais e uma Mesa de Jantar com 4 Cadeiras por 1200 reais. Entrega agendada para sábado de manhã com montagem no local, pagamento 50% no Pix e o restante no cartão..."
                                        rows={5}
                                        className="w-full p-4 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none custom-scrollbar text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none transition-all"
                                    />
                                    {isListening && (
                                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-full">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                                                Transcrevendo ao vivo...
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                        💡 Você pode alterar o texto a qualquer momento e clicar em Gerar novamente.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleGenerateAI}
                                        disabled={isProcessingAI}
                                        className="px-6 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isProcessingAI ? (
                                            <>
                                                <i className="bi bi-arrow-repeat animate-spin text-sm" />
                                                Processando com IA...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-stars text-sm" />
                                                {lastParsedResult ? 'Gerar / Atualizar Novamente' : 'Gerar Pedido com IA'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Área de Validação e Feedback da IA (Campos Identificados e Avisos de Campos Faltantes) */}
                            {lastParsedResult && (
                                <div className="flex flex-col gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                                                Resultado da Análise da IA
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {lastParsedResult.summary}
                                        </span>
                                    </div>

                                    {/* Grid de Dados Identificados */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Cliente</span>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                                                {identified.clientName || 'Não identificado'}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Telefone</span>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                                                {identified.clientPhone || 'Não informado'}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Produtos</span>
                                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                                                {identified.itemsCount ? `${identified.itemsCount} item(ns)` : '0 itens'}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Valor Total</span>
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                {identified.totalAmount 
                                                    ? Number(identified.totalAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                    : 'R$ 0,00'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* ÁREA DE AVISOS E CAMPOS OBRIGATÓRIOS FALTANTES (DESTAQUE) */}
                                    {(missing.length > 0 || warnings.length > 0) && (
                                        <div className="flex flex-col gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                                <i className="bi bi-exclamation-triangle-fill text-sm" />
                                                <span className="text-[11px] font-black uppercase tracking-wider">
                                                    Avisos e Campos Importantes Faltantes:
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {missing.map((m: string, idx: number) => (
                                                    <div 
                                                        key={`missing-${idx}`}
                                                        className="px-2.5 py-1 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 text-[10px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5"
                                                    >
                                                        <i className="bi bi-x-circle-fill text-amber-600 dark:text-amber-400 text-[10px]" />
                                                        {m}
                                                    </div>
                                                ))}
                                                {warnings.map((w: string, idx: number) => (
                                                    <div 
                                                        key={`warn-${idx}`}
                                                        className="px-2.5 py-1 rounded-lg bg-blue-100/60 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-1.5"
                                                    >
                                                        <i className="bi bi-info-circle-fill text-blue-500 text-[10px]" />
                                                        {w}
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-1">
                                                Você pode complementar as informações no texto acima e clicar em "Gerar / Atualizar Novamente" ou aplicar e preencher manualmente no formulário.
                                            </p>
                                        </div>
                                    )}

                                    {/* Botão de Aplicação no Pedido */}
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="button"
                                            onClick={handleConfirmApply}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
                                        >
                                            <i className="bi bi-check2-circle text-base" />
                                            Injetar e Preencher no Pedido
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Aba de Importação Manual JSON */
                        <div className="flex flex-col gap-4 animate-fade-in">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Carregue um arquivo JSON gerado anteriormente ou cole a estrutura JSON diretamente abaixo.
                            </p>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 transition-all cursor-pointer shadow-sm">
                                    <i className="bi bi-cloud-upload-fill text-xs" /> Carregar Arquivo JSON
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            <div className="flex flex-col gap-2">
                                <textarea
                                    value={manualJSON}
                                    onChange={(e) => setManualJSON(e.target.value)}
                                    placeholder="Cole aqui o JSON estruturado..."
                                    rows={8}
                                    className="w-full p-3.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none custom-scrollbar text-slate-800 dark:text-slate-200"
                                />
                                <button
                                    type="button"
                                    onClick={handleProcessManualJSON}
                                    className="self-end px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                                >
                                    Processar e Preencher
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartAIFillModal;
