import React, { useState } from 'react';
import { WhatsAppMessage } from '../types';
import { useCustomerSupportMedia } from '../hooks/useCustomerSupportMedia';
import { MediaLoadStatus } from './chat/bubble/MediaLoadStatus';
import {
  renderFormattedText,
  SystemEventBubble,
  InternalNoteBubble,
  MessageBubbleStatus,
  MessageBubbleMedia,
  MediaLightboxModal,
} from './chat/bubble';

export interface MessageBubbleProps {
  message: WhatsAppMessage;
  contactName?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, contactName }) => {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const isInbound = message.direction === 'inbound';
  const isInternalNote = message.messageType === 'internal_note';
  const isSystemEvent = message.messageType === 'system_event';
  const { mediaUrl, isLoadingMedia, mediaError, retryMedia } = useCustomerSupportMedia(
    ['image', 'document', 'audio', 'video', 'sticker'].includes(message.messageType) ? message.mediaId : null
  );

  const timeFormatted = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // 1. Eventos de Sistema / Automação (Centralizados na timeline)
  if (isSystemEvent) {
    return <SystemEventBubble message={message} timeFormatted={timeFormatted} />;
  }

  // 2. Comentários Internos da Equipe ("Leaving a comment here")
  if (isInternalNote) {
    return <InternalNoteBubble message={message} timeFormatted={timeFormatted} />;
  }

  // 3. Mensagens Padrão (Inbound e Outbound) com Avatares Laterais
  const senderInitials = isInbound
    ? (contactName || 'C')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : (message.authorName || 'M')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');

  return (
    <div
      className={`flex w-full my-1.5 items-end gap-2 ${
        isInbound ? 'justify-start' : 'justify-end'
      }`}
    >
      {/* Avatar do Contato (à esquerda em mensagens recebidas) */}
      {isInbound && (
        <div
          title={contactName || 'Cliente'}
          className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs border border-slate-300/50 dark:border-slate-600 mb-0.5"
        >
          {senderInitials || <i className="bi bi-person text-xs text-slate-400"></i>}
        </div>
      )}

      <div
        className={`relative max-w-[85%] sm:max-w-[72%] md:max-w-[62%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs leading-relaxed select-text transition-all ${
          isInbound
            ? 'bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/50 dark:border-slate-700/50'
            : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-xs border border-emerald-200/60 dark:border-emerald-700/50'
        }`}
      >
        {/* Caixa de Mensagem Respondida (Quote / Reply) */}
        {message.replyToWamid && (
          <div className="mb-2 p-2 rounded-xl bg-black/5 dark:bg-white/10 border-l-4 border-emerald-600 dark:border-emerald-400 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="font-semibold block text-[10px] text-emerald-700 dark:text-emerald-400">
              Mensagem citada
            </span>
            <span className="truncate block opacity-80">Referência à mensagem anterior</span>
          </div>
        )}

        {/* Mídias diversas (Imagem, Documento, Áudio, Vídeo, Interativo) */}
        <MediaLoadStatus loading={isLoadingMedia} error={mediaError} onRetry={retryMedia} />
        <MessageBubbleMedia
          message={message}
          mediaUrl={mediaUrl}
          onOpenLightbox={() => setIsMediaModalOpen(true)}
        />

        {/* Texto Padrão */}
        {message.messageType === 'text' && (
          <p className="whitespace-pre-wrap break-words font-normal leading-relaxed text-[13px]">
            {message.textContent ? renderFormattedText(message.textContent) : ''}
          </p>
        )}

        {/* Rodapé do Balão: Horário e Indicadores de Entrega */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-400 select-none">
          <span>{timeFormatted}</span>

          {/* Checks de Entrega nas Mensagens Enviadas */}
          {!isInbound && (
            <MessageBubbleStatus
              status={message.status}
              failureReason={message.failureReason}
            />
          )}
        </div>
      </div>

      {/* Avatar do Atendente (à direita em mensagens enviadas) */}
      {!isInbound && (
        <div
          title={message.authorName || 'Atendente'}
          className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs border border-emerald-700/40 mb-0.5"
        >
          {senderInitials || <i className="bi bi-person text-xs text-white"></i>}
        </div>
      )}

      {/* Lightbox para Visualização de Fotos em Tamanho Real */}
      <MediaLightboxModal
        isOpen={isMediaModalOpen}
        mediaUrl={mediaUrl}
        onClose={() => setIsMediaModalOpen(false)}
      />
    </div>
  );
};
