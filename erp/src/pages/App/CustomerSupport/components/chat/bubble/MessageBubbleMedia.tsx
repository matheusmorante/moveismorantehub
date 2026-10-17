import React from 'react';
import { WhatsAppMessage } from '../../../types';

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
  // 1. Imagem
  if (message.messageType === 'image') {
    return (
      <div className="mb-2 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={message.mediaCaption || 'Foto compartilhada no WhatsApp'}
            loading="lazy"
            onClick={onOpenLightbox}
            className="w-full max-h-72 object-cover cursor-pointer hover:opacity-95 transition-opacity"
          />
        ) : (
          <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <i className="bi bi-image text-lg"></i>
            Foto recebida
          </div>
        )}
        {message.mediaCaption && (
          <p className="p-2 text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
            {message.mediaCaption}
          </p>
        )}
      </div>
    );
  }

  // 2. Documento / PDF
  if (message.messageType === 'document') {
    return (
      <div className="mb-2 flex items-center gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-black/20 border border-slate-200/60 dark:border-slate-700">
        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
          <i className="bi bi-file-earmark-pdf-fill text-xl"></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {message.mediaFilename || 'Documento'}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-mono">
            {message.mediaMimeType?.split('/')[1] || 'PDF'}
          </span>
        </div>
        {mediaUrl && (
          <a
            href={mediaUrl}
            download={message.mediaFilename || 'documento'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors shrink-0 shadow-xs"
            title="Baixar arquivo"
          >
            <i className="bi bi-download text-xs"></i>
          </a>
        )}
      </div>
    );
  }

  // 3. Mensagem de Voz / Áudio
  if (message.messageType === 'audio') {
    return (
      <div className="mb-2 p-1 rounded-xl bg-black/5 dark:bg-black/20">
        {mediaUrl ? (
          <audio controls src={mediaUrl} className="w-full h-8" />
        ) : (
          <div className="p-2 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2">
            <i className="bi bi-mic-fill text-emerald-500 text-base"></i>
            Mensagem de voz
          </div>
        )}
      </div>
    );
  }

  // 4. Vídeo
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
            {message.mediaCaption}
          </p>
        )}
      </div>
    );
  }

  // 5. Mensagem Interativa / Botões
  if (message.messageType === 'interactive') {
    return (
      <div className="mb-1 p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 font-medium">
        {message.textContent}
      </div>
    );
  }

  // 6. Formato não suportado
  if (message.messageType === 'unsupported') {
    return (
      <div className="mb-1 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-2">
        <i className="bi bi-info-circle-fill text-amber-500"></i>
        <span>{message.textContent}</span>
      </div>
    );
  }

  return null;
};
