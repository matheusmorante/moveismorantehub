import React from 'react';

interface ChatComposerStatusProps {
  canSend: boolean;
  isChannelConnected: boolean;
  careWindowOpen: boolean;
  isOutcomeUncertain: boolean;
  sendError: string;
  isRefreshingForRetry: boolean;
  onRefreshForRetry: () => void;
  sendFeedback: string;
}

export const ChatComposerStatus: React.FC<ChatComposerStatusProps> = ({
  canSend,
  isChannelConnected,
  careWindowOpen,
  isOutcomeUncertain,
  sendError,
  isRefreshingForRetry,
  onRefreshForRetry,
  sendFeedback,
}) => (
  <>
    {!canSend && <p role="status" className="px-1 text-[11px] text-slate-500">Seu perfil não tem permissão para enviar mensagens pela Central.</p>}
    {canSend && !isChannelConnected && <p role="status" className="px-1 text-[11px] text-amber-700 dark:text-amber-300">O canal WhatsApp desta conversa está desconectado.</p>}
    {canSend && isChannelConnected && !careWindowOpen && <p role="status" className="px-1 text-[11px] text-amber-700 dark:text-amber-300">A janela de atendimento de 24 horas está fechada. Aguarde uma nova mensagem do cliente.</p>}
    {isOutcomeUncertain && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"><span>{sendError}</span><button type="button" onClick={onRefreshForRetry} disabled={isRefreshingForRetry} className="rounded-md bg-white px-2 py-1 font-bold disabled:opacity-50 dark:bg-slate-900">{isRefreshingForRetry ? 'Atualizando…' : 'Atualizar conversa'}</button></div>}
    {sendError && !isOutcomeUncertain && <p role="alert" className="px-1 text-[11px] text-red-600 dark:text-red-400">{sendError}</p>}
    {sendFeedback && !isOutcomeUncertain && <p role="status" className={`px-1 text-[11px] ${sendFeedback.includes('aceitou') ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{sendFeedback}</p>}
  </>
);
