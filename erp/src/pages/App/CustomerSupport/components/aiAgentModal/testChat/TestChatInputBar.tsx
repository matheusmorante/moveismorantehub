import React from 'react';

interface TestChatInputBarProps {
  inputRef: React.Ref<HTMLInputElement>;
  inputText: string;
  setInputText: (text: string) => void;
  error?: string;
  isGenerating: boolean;
  onSendMessage: () => void;
}

export const TestChatInputBar: React.FC<TestChatInputBarProps> = ({
  inputRef,
  inputText,
  setInputText,
  error,
  isGenerating,
  onSendMessage,
}) => {
  return (
    <form
      aria-label="Mensagem de teste"
      onSubmit={(event) => { event.preventDefault(); onSendMessage(); }}
      className="p-2 sm:p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0"
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          aria-label="Mensagem para o agente de IA"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'ai-test-message-error' : undefined}
          placeholder="Digite uma mensagem para o Lizandro testar no ERP..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isGenerating}
          className="flex-1 min-w-0 px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />

        <button
          type="submit"
          aria-label="Enviar mensagem de teste"
          disabled={!inputText.trim() || isGenerating}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          {isGenerating ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <i className="bi bi-send-fill text-xs" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </div>
      {error && <p id="ai-test-message-error" role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </form>
  );
};
