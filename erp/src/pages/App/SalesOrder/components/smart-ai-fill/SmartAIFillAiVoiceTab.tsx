import React from 'react';
import { SmartAIFillParsedResult } from './types';
import { SmartAIFillFeedback } from './SmartAIFillFeedback';

interface SmartAIFillAiVoiceTabProps {
  isListening: boolean;
  liveTranscript: string;
  promptText: string;
  setPromptText: (text: string) => void;
  isProcessingAI: boolean;
  busy: boolean;
  applyBlocked: boolean;
  lastParsedResult: SmartAIFillParsedResult | null;
  setLastParsedResult: (res: SmartAIFillParsedResult | null) => void;
  toggleListening: () => void;
  clearPrompt: () => void;
  handleGenerateAI: () => void;
  handleConfirmApply: () => void;
}

export const SmartAIFillAiVoiceTab: React.FC<SmartAIFillAiVoiceTabProps> = ({
  isListening,
  liveTranscript,
  promptText,
  setPromptText,
  isProcessingAI,
  busy,
  applyBlocked,
  lastParsedResult,
  setLastParsedResult,
  toggleListening,
  clearPrompt,
  handleGenerateAI,
  handleConfirmApply,
}) => {
  return (
    <>
      {/* Botão Principal: Live de Áudio ao Vivo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-indigo-500/10 dark:from-violet-950/30 dark:via-blue-950/20 dark:to-indigo-950/30 border border-violet-200/60 dark:border-violet-800/40">
        <div className="flex items-center gap-3">
          <div
            className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${
              isListening
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                : 'bg-gradient-to-tr from-violet-600 to-blue-600 text-white shadow-md shadow-blue-500/20'
            }`}
          >
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
              {isListening ? 'Gravando Áudio ao Vivo...' : 'Falar ao Vivo com a IA'}
              {isListening && (
                <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[9px] font-black animate-pulse">
                  LIVE
                </span>
              )}
            </h4>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {isListening
                ? 'Fale normalmente: cliente, endereço, produtos, valores e forma de pagamento.'
                : 'Clique no botão ao lado para ditar o pedido por voz em tempo real.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleListening}
          disabled={busy || applyBlocked}
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
              disabled={busy || applyBlocked}
              onClick={clearPrompt}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors"
            >
              Limpar Texto
            </button>
          )}
        </div>

        <div className="relative">
          <textarea
            value={promptText + (liveTranscript ? ` ${liveTranscript}` : '')}
            onChange={(e) => {
              setPromptText(e.target.value);
              setLastParsedResult(null);
            }}
            disabled={busy || applyBlocked}
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
            disabled={busy || applyBlocked}
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

      {lastParsedResult && (
        <SmartAIFillFeedback
          result={lastParsedResult}
          busy={busy}
          applyBlocked={applyBlocked}
          onConfirmApply={handleConfirmApply}
        />
      )}
    </>
  );
};
