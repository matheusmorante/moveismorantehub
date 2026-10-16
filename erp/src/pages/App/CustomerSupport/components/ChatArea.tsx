import React, { useRef, useEffect } from 'react';
import { WhatsAppConversation, WhatsAppMessage } from '../types';
import { MessageBubble } from './MessageBubble';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';

interface ChatAreaProps {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  isLoadingMessages: boolean;
  onBackMobile: () => void;
  isInfoPanelOpen: boolean;
  onToggleInfoPanel: () => void;
  onToggleArchive: () => void;
}

export function groupMessagesByDate(
  messages: WhatsAppMessage[]
): { dateLabel: string; items: WhatsAppMessage[] }[] {
  const groups: { [key: string]: WhatsAppMessage[] } = {};

  for (const msg of messages) {
    const d = new Date(msg.timestamp);
    const dateKey = !isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : 'Desconhecida';

    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
  }

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  return Object.keys(groups).map((key) => {
    let dateLabel = key;
    if (key === todayKey) {
      dateLabel = 'Hoje';
    } else if (key === yesterdayKey) {
      dateLabel = 'Ontem';
    } else {
      const [y, m, d] = key.split('-');
      dateLabel = `${d}/${m}/${y}`;
    }

    return {
      dateLabel,
      items: groups[key],
    };
  });
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  isLoadingMessages,
  onBackMobile,
  isInfoPanelOpen,
  onToggleInfoPanel,
  onToggleArchive,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a mensagem mais recente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, conversation.id]);

  const displayName =
    conversation.customer?.fullName ||
    conversation.contactName ||
    formatPhoneForDisplay(conversation.contactPhone);

  const formattedPhone = formatPhoneForDisplay(conversation.contactPhone);
  const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);
  const grouped = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/70 dark:bg-slate-950/70 relative overflow-hidden">
      {/* 1. Header da Conversa Ativa */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Botão de Voltar para Mobile */}
          <button
            onClick={onBackMobile}
            className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="bi bi-chevron-left text-base"></i>
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs shrink-0 border border-slate-200 dark:border-slate-700">
            {displayName.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {displayName}
              </h3>
              {conversation.customerId ? (
                <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[9px] font-bold">
                  Cliente ERP
                </span>
              ) : conversation.customerLinkStatus === 'ambiguous' ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                  Ambiguidade
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-medium">
                  Não identificado
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="font-mono">{formattedPhone}</span>
              <span>•</span>
              {/* Indicador da Janela de 24h */}
              <span
                className={`flex items-center gap-1 font-medium ${
                  careWindow.isOpen
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                <i
                  className={`bi ${careWindow.isOpen ? 'bi-check-circle-fill' : 'bi-clock-history'}`}
                ></i>
                {careWindow.isOpen
                  ? `Janela 24h aberta (${careWindow.remainingHours}h restantes)`
                  : 'Janela 24h fechada'}
              </span>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleArchive}
            title={conversation.isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              conversation.isArchived
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <i className="bi bi-archive text-sm"></i>
          </button>

          <button
            onClick={onToggleInfoPanel}
            title="Alternar painel de informações do cliente e pedidos"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isInfoPanelOpen
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <i className="bi bi-layout-sidebar-reverse text-sm"></i>
          </button>
        </div>
      </div>

      {/* 2. Área Central de Mensagens com Fundo Estilo Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-[11px] text-slate-400">Carregando histórico...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <i className="bi bi-chat-square-text text-3xl block mb-2 opacity-40"></i>
            Nenhuma mensagem registrada nesta conversa.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.dateLabel} className="space-y-2">
              {/* Separador de Data */}
              <div className="flex justify-center my-3 sticky top-2 z-10 select-none">
                <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 text-[10px] font-bold shadow-sm border border-slate-200/50 dark:border-slate-700/60 backdrop-blur-sm">
                  {group.dateLabel}
                </span>
              </div>

              {/* Balões de Mensagem */}
              {group.items.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Campo de Composição Inferior (Desabilitado com Ícone de Bloqueio - Custo Zero) */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 select-none">
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700 opacity-90">
          <i
            className="bi bi-lock-fill text-amber-500 text-base shrink-0"
            title="Envio bloqueado para proteção de custo zero"
          ></i>

          <input
            type="text"
            disabled
            readOnly
            value="Envio indisponível. Central em modo de visualização gratuita."
            className="w-full bg-transparent text-xs text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed focus:outline-none select-none"
          />

          <button
            type="button"
            disabled
            title="Envio desativado na primeira versão para prevenção de custos da Meta"
            className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed flex items-center justify-center shrink-0"
          >
            <i className="bi bi-send-fill text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
};
