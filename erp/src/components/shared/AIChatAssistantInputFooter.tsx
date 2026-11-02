import React from 'react';

interface AIChatAssistantInputFooterProps {
  input: string;
  isListening: boolean;
  isCallMode: boolean;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onToggleListening: () => void;
}

export function AIChatAssistantInputFooter({
  input,
  isListening,
  isCallMode,
  isLoading,
  onInputChange,
  onSubmit,
  onToggleListening,
}: AIChatAssistantInputFooterProps) {
  return (
    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
      <div className="relative flex items-center gap-2">
        <input
          type="text"
          aria-label="Mensagem para o assistente"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onSubmit()}
          placeholder={
            isListening ? 'Ouvindo você...' : 'Ex: Paguei 230 de gasolina hoje no Pix...'
          }
          className={`w-full pl-5 pr-20 py-3 bg-slate-100 dark:bg-slate-950 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-slate-200 ${
            isListening ? 'ring-2 ring-red-500 animate-pulse' : ''
          }`}
        />
        <div className="absolute right-2 top-1.5 flex gap-1">
          <button
            onClick={() => onToggleListening()}
            disabled={isLoading}
            className={`p-1.5 rounded-xl transition-all ${
              isListening && !isCallMode
                ? 'bg-red-500 text-white animate-bounce'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-indigo-600'
            }`}
            title="Falar"
          >
            <i className={`bi ${isListening && !isCallMode ? 'bi-mic-fill' : 'bi-mic'} text-sm`}></i>
          </button>
          <button
            onClick={() => onSubmit()}
            aria-label="Enviar mensagem"
            disabled={!input.trim() || isLoading}
            className="p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <i className="bi bi-send-fill text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
