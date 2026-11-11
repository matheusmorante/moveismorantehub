import React from 'react';
import type { SimulationTurnResult } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';

export interface TestChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  diagnostic?: SimulationTurnResult;
  rating?: 'correct' | 'incorrect';
  ratingComment?: string;
}

interface TestChatMessageBubbleProps {
  message: TestChatMessage;
  onOpenDiagnostic: (diagnostic: SimulationTurnResult) => void;
  onRateMessage: (messageId: string, rating: 'correct' | 'incorrect') => void;
  feedbackInputId: string | null;
  feedbackComment: string;
  setFeedbackComment: (value: string) => void;
  feedbackInputRef: React.Ref<HTMLInputElement>;
  feedbackError?: string;
  onSaveFeedbackComment: (messageId: string) => void;
}

export const TestChatMessageBubble: React.FC<TestChatMessageBubbleProps> = ({
  message,
  onOpenDiagnostic,
  onRateMessage,
  feedbackInputId,
  feedbackComment,
  setFeedbackComment,
  feedbackInputRef,
  feedbackError,
  onSaveFeedbackComment,
}) => {
  const isUser = message.role === 'user';
  const feedbackErrorId = `ai-test-feedback-error-${message.id}`;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-xs text-xs leading-relaxed transition-all ${
          isUser
            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-xs border border-emerald-200/60 dark:border-emerald-700/50'
            : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60'
        }`}
      >
        {/* Cabeçalho da mensagem do assistente */}
        {!isUser && (
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-700/60 text-[10px] select-none">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <i className="bi bi-robot text-xs" aria-hidden="true" />
              Lizandro (IA)
            </span>
            <span className="text-slate-400 font-mono">
              {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Texto da Mensagem */}
        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
          {message.text}
        </p>

        {/* Horário da mensagem do usuário */}
        {isUser && (
          <div className="flex justify-end mt-1 text-[10px] text-emerald-800 dark:text-emerald-200/70 select-none">
            <span>
              {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Barra de Diagnóstico e Avaliação por Mensagem da IA */}
        {!isUser && message.diagnostic && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/50 space-y-2 select-none">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Pill de Diagnóstico Rápido */}
              <button
                type="button"
                onClick={() => onOpenDiagnostic(message.diagnostic!)}
                className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Ver parâmetros, ferramentas do ERP e regras acionadas"
              >
                <i className="bi bi-cpu text-[10px]" />
                <span>
                  {message.diagnostic.toolsCalled.length} ferramenta(s) ·{' '}
                  {message.diagnostic.situation?.name ? message.diagnostic.situation.name.slice(0, 18) : 'Geral'} ·{' '}
                  {(message.diagnostic.executionTimeMs / 1000).toFixed(1)}s
                </span>
                <i className="bi bi-chevron-right text-[9px] ml-0.5 opacity-60" />
              </button>

              {/* Botões de Avaliação 👍 / 👎 */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onRateMessage(message.id, 'correct')}
                  className={`p-1 rounded-md text-xs cursor-pointer transition-colors ${
                    message.rating === 'correct'
                      ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 font-bold'
                      : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title="Avaliar como resposta correta"
                >
                  <i className="bi bi-hand-thumbs-up" />
                </button>

                <button
                  type="button"
                  onClick={() => onRateMessage(message.id, 'incorrect')}
                  className={`p-1 rounded-md text-xs cursor-pointer transition-colors ${
                    message.rating === 'incorrect'
                      ? 'text-rose-600 bg-rose-100 dark:bg-rose-950/80 font-bold'
                      : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title="Avaliar como resposta incorreta"
                >
                  <i className="bi bi-hand-thumbs-down" />
                </button>
              </div>
            </div>

            {/* Caixa de Comentário para resposta incorreta */}
            {feedbackInputId === message.id && (
              <form
                onSubmit={(event) => { event.preventDefault(); onSaveFeedbackComment(message.id); }}
                className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-1.5 animate-fade-in"
              >
                <label htmlFor={`ai-test-feedback-${message.id}`} className="text-[10px] font-semibold text-rose-800 dark:text-rose-300 block">
                  Qual foi a falha desta resposta?
                </label>
                <div className="flex gap-1.5">
                  <input
                    id={`ai-test-feedback-${message.id}`}
                    ref={feedbackInputRef}
                    type="text"
                    aria-invalid={Boolean(feedbackError)}
                    aria-describedby={feedbackError ? feedbackErrorId : undefined}
                    placeholder="Ex: Não informou a taxa de entrega corretamente..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
                {feedbackError && <p id={feedbackErrorId} role="alert" className="text-xs text-red-700 dark:text-red-300">{feedbackError}</p>}
              </form>
            )}

            {message.ratingComment && (
              <div className="text-[10px] text-slate-500 italic">
                Observação registrada: &ldquo;{message.ratingComment}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
