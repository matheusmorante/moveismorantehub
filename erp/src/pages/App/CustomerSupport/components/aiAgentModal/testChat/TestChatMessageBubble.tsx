import React, { useMemo } from 'react';
import type { SimulationTurnResult } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';
import type { WhatsAppMessage } from '../../../types';
import type { CatalogInteractiveProductCard } from '../../../catalogInteractiveProducts';
import { InteractiveMessageMedia } from '../../chat/bubble/media/InteractiveMessageMedia';

export interface TestChatMessage {
  id: string;
  role: 'user' | 'model' | 'handoff';
  text: string;
  suggestionStatus?: 'pending' | 'accepted';
  handoffReason?: string;
  timestamp: Date;
  diagnostic?: SimulationTurnResult;
  rating?: 'correct' | 'incorrect';
  ratingComment?: string;
  nativeCatalogProducts?: Array<{ retailerId: string; name: string }>;
}

interface TestChatMessageBubbleProps {
  message: TestChatMessage;
  isSelected?: boolean;
  onSelectMessage?: (messageId: string) => void;
  onEditSuggestion?: (messageId: string, text: string) => void;
  onAcceptSuggestion?: (messageId: string, text: string) => void;
  onRejectSuggestion?: (messageId: string) => void;
  onOpenDiagnostic: (diagnostic: SimulationTurnResult) => void;
  onRateMessage: (messageId: string, rating: 'correct' | 'incorrect') => void;
  feedbackInputId: string | null;
  feedbackComment: string;
  setFeedbackComment: (value: string) => void;
  feedbackInputRef: React.Ref<HTMLInputElement>;
  feedbackError?: string;
  onSaveFeedbackComment: (messageId: string) => void;
  catalogProductCards?: Record<string, CatalogInteractiveProductCard>;
  loadingCatalogRetailerIds?: ReadonlySet<string>;
}

export const TestChatMessageBubble: React.FC<TestChatMessageBubbleProps> = ({
  message,
  isSelected = false,
  onSelectMessage,
  onEditSuggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  onOpenDiagnostic,
  onRateMessage,
  feedbackInputId,
  feedbackComment,
  setFeedbackComment,
  feedbackInputRef,
  feedbackError,
  onSaveFeedbackComment,
  catalogProductCards = {},
  loadingCatalogRetailerIds = new Set<string>(),
}) => {
  const isUser = message.role === 'user';
  const isHandoff = message.role === 'handoff';
  const isPendingSuggestion = !isUser && message.suggestionStatus === 'pending';
  const isAcceptedSuggestion = message.suggestionStatus === 'accepted';
  const feedbackErrorId = `ai-test-feedback-error-${message.id}`;

  const virtualMessage = useMemo<WhatsAppMessage | null>(() => {
    if (!message.nativeCatalogProducts || message.nativeCatalogProducts.length === 0) return null;
    return {
      id: message.id,
      conversationId: 'simulated_test_chat',
      apiMessageId: null,
      direction: 'outbound',
      messageType: 'interactive',
      textContent: null,
      mediaId: null,
      mediaMimeType: null,
      mediaUrl: null,
      mediaFilename: null,
      mediaCaption: null,
      replyToMessageId: null,
      replyToWamid: null,
      status: 'delivered',
      errorCode: null,
      failureReason: null,
      timestamp: message.timestamp.toISOString(),
      createdAt: message.timestamp.toISOString(),
      rawPayload: {
        nativeCatalogProducts: message.nativeCatalogProducts,
        catalog_products: message.nativeCatalogProducts,
        interactive: {
          type: 'product_list',
          header: { type: 'text', text: 'Opções encontradas' },
          body: { text: '' },
          action: {
            sections: [
              {
                title: 'Produtos',
                product_items: message.nativeCatalogProducts.map((p) => ({
                  product_retailer_id: p.retailerId,
                })),
              },
            ],
          },
        },
      },
    };
  }, [message.id, message.nativeCatalogProducts, message.timestamp]);

  if (isHandoff) {
    return (
      <div className="flex w-full justify-center">
        <div
          role="status"
          aria-label="Intervenção solicitada ao atendente"
          className="w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 shadow-xs dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <div className="flex items-center gap-2 font-semibold">
            <i className="bi bi-person-exclamation text-amber-600 dark:text-amber-300" aria-hidden="true" />
            Intervenção humana solicitada no teste
          </div>
          <p className="mt-1 break-words text-amber-900/90 dark:text-amber-100/90">
            Motivo para a equipe: {message.handoffReason || 'A conversa precisa de análise humana.'}
          </p>
          {message.diagnostic && (
            <button
              type="button"
              onClick={() => onOpenDiagnostic(message.diagnostic!)}
              className="mt-2 font-semibold text-amber-800 underline underline-offset-2 dark:text-amber-200"
            >
              Ver diagnóstico
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser || isAcceptedSuggestion ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`text-xs leading-relaxed transition-all ${
          isPendingSuggestion
            ? 'w-full max-w-2xl rounded-2xl border border-emerald-300 bg-emerald-50/95 p-3 text-slate-900 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-slate-100'
            : `max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-xs ${
              isUser || isAcceptedSuggestion
                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-xs border border-emerald-200/60 dark:border-emerald-700/50'
                : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60'
            }`
        } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-950' : ''}`}
      >
        {/* Cabeçalho da mensagem do assistente */}
        {isPendingSuggestion && (
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-emerald-200 text-[10px] select-none dark:border-emerald-800">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <i className="bi bi-stars" aria-hidden="true" />
              Sugestão da IA
            </span>
            <span className="text-slate-500 dark:text-slate-400">Não enviada</span>
          </div>
        )}
        {!isUser && !isPendingSuggestion && !isAcceptedSuggestion && (
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-700/60 text-[10px] select-none">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              Seu Lizandro
            </span>
            <span className="text-slate-400 font-mono">
              {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Texto da Mensagem */}
        {isPendingSuggestion ? (
          <>
            <textarea
              aria-label="Editar sugestão da IA"
              value={message.text}
              onChange={(event) => onEditSuggestion?.(message.id, event.target.value)}
              rows={3}
              className="w-full min-h-[72px] resize-y rounded-lg border border-slate-400 bg-white/70 px-3 py-2 text-[13px] leading-relaxed text-slate-900 outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
            />
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => onRejectSuggestion?.(message.id)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white dark:border-emerald-800 dark:bg-slate-900/60 dark:text-slate-300"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
                Recusar
              </button>
              <button
                type="button"
                disabled={!message.text.trim()}
                onClick={() => onAcceptSuggestion?.(message.id, message.text)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="bi bi-send" aria-hidden="true" />
                Aceitar e enviar
              </button>
            </div>
            <p className="mt-1.5 text-right text-[9px] text-emerald-800/70 dark:text-emerald-300/70">
              Protótipo visual: as ações são simuladas e não enviam mensagens.
            </p>
          </>
        ) : (
          <p
            role={onSelectMessage ? 'button' : undefined}
            tabIndex={onSelectMessage ? 0 : undefined}
            aria-pressed={onSelectMessage ? isSelected : undefined}
            onClick={() => onSelectMessage?.(message.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectMessage?.(message.id);
              }
            }}
            className={`whitespace-pre-wrap break-words text-[13px] leading-relaxed ${onSelectMessage ? 'cursor-pointer' : ''}`}
          >
            {message.text}
          </p>
        )}

        {/* Cards interativos do catálogo do WhatsApp */}
        {!isUser && virtualMessage && (
          <div className="mt-2.5">
            <InteractiveMessageMedia
              message={virtualMessage}
              catalogProductCards={catalogProductCards}
              loadingCatalogRetailerIds={loadingCatalogRetailerIds}
            />
          </div>
        )}

        {/* Horário da mensagem do usuário */}
        {(isUser || isAcceptedSuggestion) && (
          <div className="flex justify-end mt-1 text-[10px] text-emerald-800 dark:text-emerald-200/70 select-none">
            <span>
              {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isAcceptedSuggestion && <i className="bi bi-check-all text-blue-500" aria-label="Aceita no protótipo" />}
          </div>
        )}

        {/* Barra de Diagnóstico e Avaliação por Mensagem da IA */}
        {!isUser && !isAcceptedSuggestion && message.diagnostic && (
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
