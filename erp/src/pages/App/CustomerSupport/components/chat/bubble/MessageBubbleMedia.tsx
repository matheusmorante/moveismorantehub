import React from 'react';
import type { WhatsAppMessage } from '../../../types';
import { MessageAudioPlayer } from './MessageAudioPlayer';
import { renderFormattedText } from './bubbleUtils';
import {
  TemplateMessageMedia,
  DocumentMessageMedia,
  LocationAndContactsMedia,
  InteractiveMessageMedia,
  UnsupportedMessageMedia,
} from './media';

interface MessageBubbleMediaProps {
  message: WhatsAppMessage;
  mediaUrl: string | null;
  onOpenLightbox: () => void;
}

export const MessageBubbleMedia: React.FC<MessageBubbleMediaProps> = ({
  message,
  mediaUrl,
  onOpenLightbox,
}) => {
  // 1. Mensagem de Template do WhatsApp
  if (message.messageType === 'template') {
    return (
      <TemplateMessageMedia
        message={message}
        mediaUrl={mediaUrl}
        onOpenLightbox={onOpenLightbox}
      />
    );
  }

  // 2. Imagem / Figurinha
  if (message.messageType === 'image' || message.messageType === 'sticker') {
    return (
      <div className="mb-2 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={
              message.mediaCaption ||
              (message.messageType === 'sticker'
                ? 'Figurinha recebida no WhatsApp'
                : 'Foto compartilhada no WhatsApp')
            }
            loading="lazy"
            onClick={onOpenLightbox}
            className="w-full max-h-72 object-cover cursor-pointer hover:opacity-95 transition-opacity"
          />
        ) : (
          <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <i className="bi bi-image text-lg"></i>
            {message.messageType === 'sticker' ? 'Figurinha recebida' : 'Foto recebida'}
          </div>
        )}
        {message.mediaCaption && (
          <p className="p-2 text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
            {renderFormattedText(message.mediaCaption)}
          </p>
        )}
      </div>
    );
  }

  // 3. Documento / PDF
  if (message.messageType === 'document') {
    return <DocumentMessageMedia message={message} mediaUrl={mediaUrl} />;
  }

  // 4. Mensagem de Voz / Áudio
  if (message.messageType === 'audio') {
    return (
      <div className="mb-2 rounded-xl bg-black/5 p-2 dark:bg-black/20">
        {mediaUrl ? (
          <MessageAudioPlayer src={mediaUrl} />
        ) : (
          <div className="p-2 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2">
            <i className="bi bi-mic-fill text-emerald-500 text-base"></i>
            Mensagem de voz
          </div>
        )}
      </div>
    );
  }

  // 5. Vídeo
  if (message.messageType === 'video') {
    return (
      <div className="mb-2 overflow-hidden rounded-xl bg-black/10 dark:bg-black/30">
        {mediaUrl ? (
          <video controls src={mediaUrl} className="w-full max-h-72 rounded-xl" />
        ) : (
          <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <i className="bi bi-camera-video text-lg"></i>
            Vídeo recebido
          </div>
        )}
        {message.mediaCaption && (
          <p className="p-2 text-xs text-slate-800 dark:text-slate-200 font-medium">
            {renderFormattedText(message.mediaCaption)}
          </p>
        )}
      </div>
    );
  }

  // 6. Mensagem Interativa / Botões / Reação
  if (message.messageType === 'interactive') {
    return <InteractiveMessageMedia message={message} />;
  }

  // 7. Localização / Contatos
  if (message.messageType === 'location' || message.messageType === 'contacts') {
    return <LocationAndContactsMedia message={message} />;
  }

  // 8. Mensagem apagada
  if (message.messageType === 'deleted') {
    return (
      <p className="mb-1 flex items-center gap-1.5 text-[13px] italic text-slate-500 dark:text-slate-300">
        <i className="bi bi-slash-circle" aria-hidden="true"></i>
        <span>{message.textContent || 'Esta mensagem foi apagada'}</span>
      </p>
    );
  }

  // 9. Formato não suportado
  if (message.messageType === 'unsupported') {
    return <UnsupportedMessageMedia message={message} />;
  }

  return null;
};
