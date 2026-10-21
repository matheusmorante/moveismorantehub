import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supportInternalCommentSchema as internalCommentSchema } from '../../../../../../../shared-utils/customerSupportFormSchemas';

type InternalCommentForm = z.infer<typeof internalCommentSchema>;

interface ChatComposerProps {
  onAddInternalNote?: (text: string) => Promise<boolean | void>;
  onOpenSnippets: () => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onAddInternalNote,
  onOpenSnippets,
}) => {
  const [composerMode, setComposerMode] = useState<'whatsapp' | 'comment'>('whatsapp');
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InternalCommentForm>({
    resolver: zodResolver(internalCommentSchema),
    defaultValues: { comment: '' },
  });

  const handleSubmitComment = handleSubmit(async (data) => {
    if (!onAddInternalNote) return;
    try {
      const saved = await onAddInternalNote(data.comment);
      if (saved === false) {
        setError('root.server', { message: 'Não foi possível salvar o comentário.' });
        return;
      }
      reset({ comment: '' });
      setComposerMode('whatsapp');
    } catch {
      setError('root.server', { message: 'Não foi possível salvar o comentário. Tente novamente.' });
    }
  });

  return (
    <div className="p-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 shrink-0 select-none z-10 transition-colors">
      {composerMode === 'comment' ? (
        /* MODO COMENTÁRIO INTERNO: Card âmbar de colaboração da equipe */
        <form onSubmit={handleSubmitComment} className="rounded-2xl border-2 border-amber-400/80 dark:border-amber-600/70 bg-amber-50/80 dark:bg-amber-950/30 p-3 shadow-md animate-fade-in flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 font-bold border-b border-amber-200/70 dark:border-amber-800/60 pb-1.5">
            <span className="flex items-center gap-1.5">
              <i className="bi bi-lock-fill text-amber-600"></i>
              Comentário Interno da Equipe (Visível apenas internamente, não enviado ao cliente)
            </span>
            <button
              type="button"
              onClick={() => setComposerMode('whatsapp')}
              className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-white underline cursor-pointer text-[11px]"
            >
              Voltar ao WhatsApp
            </button>
          </div>

          <textarea
            {...register('comment')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void handleSubmitComment();
              }
            }}
            rows={3}
            placeholder="Escreva uma anotação interna para a equipe sobre este atendimento... (Ctrl + Enter para salvar)"
            className="w-full bg-white dark:bg-slate-900 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 border border-amber-200 dark:border-amber-700/60 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none select-text"
            autoFocus
          />
          {errors.comment && <p role="alert" className="text-[11px] text-red-600">{errors.comment.message}</p>}
          {errors.root?.server && <p role="alert" className="text-[11px] text-red-600">{errors.root.server.message}</p>}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenSnippets}
                className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                <i className="bi bi-lightning-charge-fill"></i>
                <span>Inserir Snippet</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setComposerMode('whatsapp')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <i className="bi bi-check-lg"></i>
                <span>{isSubmitting ? 'Salvando…' : 'Salvar Comentário'}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* MODO WHATSAPP: Card idêntico ao do print de referência */
        <div className="flex flex-col gap-2">
          {/* Card Flutuante do Composer */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-850 shadow-sm p-3 flex flex-col gap-2">
            {/* Topo dentro do card: Seletor de Canal "Whatsapp ▾" */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/60 cursor-pointer">
                <i className="bi bi-whatsapp text-sm text-emerald-500"></i>
                <span>Whatsapp</span>
                <i className="bi bi-chevron-down text-[9px] text-slate-400"></i>
              </div>

              <div className="flex items-center gap-1 text-slate-400 text-xs">
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">/</span>
                <span className="text-[11px]">for Snippets</span>
              </div>
            </div>

            {/* Área de Digitação */}
            <div className="relative">
              <textarea
                readOnly
                disabled
                rows={2}
                placeholder='O envio para o cliente está desativado pela política da empresa.'
                className="w-full bg-transparent border-none text-xs text-slate-500 dark:text-slate-400 placeholder-slate-400 resize-none focus:outline-none cursor-not-allowed select-none"
              />
            </div>

            {/* Barra de Ferramentas inferior do Card */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              {/* Ícones da esquerda */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  disabled
                  title="Emojis"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-not-allowed text-slate-400"
                >
                  <i className="bi bi-emoji-smile text-sm"></i>
                </button>
                <button
                  type="button"
                  disabled
                  title="Gravar áudio"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-not-allowed text-slate-400"
                >
                  <i className="bi bi-mic text-sm"></i>
                </button>
                <button
                  type="button"
                  disabled
                  title="Anexar arquivo"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-not-allowed text-slate-400"
                >
                  <i className="bi bi-paperclip text-sm"></i>
                </button>
                <button
                  type="button"
                  onClick={onOpenSnippets}
                  title="Modelos Rápidos / Snippets"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-slate-800 transition-colors cursor-pointer text-amber-500"
                >
                  <i className="bi bi-card-text text-sm"></i>
                </button>
                <button
                  type="button"
                  disabled
                  title="Inserir Variável / Tag"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-not-allowed text-slate-400"
                >
                  <i className="bi bi-tag text-sm"></i>
                </button>
                <button
                  type="button"
                  disabled
                  title="Canal WhatsApp"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-not-allowed text-emerald-500"
                >
                  <i className="bi bi-whatsapp text-sm"></i>
                </button>
                <button
                  type="button"
                  disabled
                  title="Assistente de IA / Respostas Inteligentes"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-purple-50 hover:text-purple-500 dark:hover:bg-slate-800 transition-colors cursor-not-allowed text-purple-400"
                >
                  <i className="bi bi-stars text-sm"></i>
                </button>
              </div>

              {/* Ícones da direita */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled
                  title="Expandir editor"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-not-allowed text-slate-400"
                >
                  <i className="bi bi-arrows-angle-expand text-xs"></i>
                </button>
                <button
                  type="button"
                  disabled
                  title="O envio de mensagens para o cliente está bloqueado pela política da empresa"
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shadow-xs cursor-not-allowed"
                >
                  <i className="bi bi-send-fill text-xs"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Botão abaixo do card: "Add Comment" */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setComposerMode('comment')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer py-0.5"
            >
              <i className="bi bi-chat-left-dots"></i>
              <span>Add Comment</span>
            </button>

            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <i className="bi bi-lock-fill text-amber-500"></i>
              Envio bloqueado pela política da empresa
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
