import React, { useState } from 'react';
import { WhatsAppMessage } from '../types';

interface MessageBubbleProps {
  message: WhatsAppMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const isInbound = message.direction === 'inbound';

  const timeFormatted = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // URL para download de mídias através do proxy seguro do backend
  const mediaUrl = message.mediaUrl || (message.mediaId ? `/api/whatsapp-media?id=${message.mediaId}` : null);

  return (
    <div className={`flex w-full my-1 ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%] rounded-2xl p-3 shadow-sm text-xs leading-relaxed transition-all ${
          isInbound
            ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-100 dark:border-slate-700/60'
            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 rounded-tr-sm border border-emerald-100 dark:border-emerald-800/60'
        }`}
      >
        {/* Caixa de Mensagem Respondida (Quote) */}
        {message.replyToWamid && (
          <div className="mb-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-blue-500 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold block text-[10px] text-blue-600 dark:text-blue-400">
              Resposta à mensagem anterior
            </span>
          </div>
        )}

        {/* 1. Imagem */}
        {message.messageType === 'image' && (
          <div className="mb-2 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700">
            {mediaUrl ? (
              <img
                src={mediaUrl}
                alt={message.mediaCaption || 'Imagem do WhatsApp'}
                loading="lazy"
                onClick={() => setIsMediaModalOpen(true)}
                className="w-full max-h-72 object-cover cursor-pointer hover:opacity-95 transition-opacity"
              />
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <i className="bi bi-image text-lg"></i>
                Imagem recebida
              </div>
            )}
            {message.mediaCaption && (
              <p className="p-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                {message.mediaCaption}
              </p>
            )}
          </div>
        )}

        {/* 2. Documento / PDF */}
        {message.messageType === 'document' && (
          <div className="mb-2 flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700">
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <i className="bi bi-file-earmark-pdf-fill text-lg"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {message.mediaFilename || 'Documento'}
              </p>
              <span className="text-[10px] text-slate-400 block uppercase">
                {message.mediaMimeType?.split('/')[1] || 'PDF'}
              </span>
            </div>
            {mediaUrl && (
              <a
                href={mediaUrl}
                download={message.mediaFilename || 'documento'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors shrink-0"
                title="Baixar arquivo"
              >
                <i className="bi bi-download text-xs"></i>
              </a>
            )}
          </div>
        )}

        {/* 3. Áudio */}
        {message.messageType === 'audio' && (
          <div className="mb-2 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
            {mediaUrl ? (
              <audio controls src={mediaUrl} className="w-full h-8" />
            ) : (
              <div className="p-2 text-slate-400 text-xs flex items-center gap-2">
                <i className="bi bi-mic-fill text-emerald-500"></i>
                Mensagem de voz recebida
              </div>
            )}
          </div>
        )}

        {/* 4. Vídeo */}
        {message.messageType === 'video' && (
          <div className="mb-2 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
            {mediaUrl ? (
              <video controls src={mediaUrl} className="w-full max-h-72 rounded-xl" />
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <i className="bi bi-camera-video text-lg"></i>
                Vídeo recebido
              </div>
            )}
            {message.mediaCaption && (
              <p className="p-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                {message.mediaCaption}
              </p>
            )}
          </div>
        )}

        {/* 5. Mensagem Interativa / Botão */}
        {message.messageType === 'interactive' && (
          <div className="mb-1 p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-900 dark:text-blue-200">
            <span className="font-semibold">{message.textContent}</span>
          </div>
        )}

        {/* 6. Formato não suportado */}
        {message.messageType === 'unsupported' && (
          <div className="mb-1 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-2">
            <i className="bi bi-info-circle-fill text-amber-500"></i>
            <span>{message.textContent}</span>
          </div>
        )}

        {/* 7. Texto Regular */}
        {message.messageType === 'text' && (
          <p className="whitespace-pre-wrap break-words font-normal leading-relaxed">
            {message.textContent}
          </p>
        )}

        {/* Rodapé do Balão: Horário e Status */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-400 select-none">
          <span>{timeFormatted}</span>

          {/* Indicadores de entrega na mensagem enviada */}
          {!isInbound && (
            <span>
              {message.status === 'read' ? (
                <i className="bi bi-check-all text-blue-500 font-bold text-xs" title="Lida"></i>
              ) : message.status === 'delivered' ? (
                <i className="bi bi-check-all text-slate-400 font-bold text-xs" title="Entregue"></i>
              ) : message.status === 'sent' ? (
                <i className="bi bi-check text-slate-400 text-xs" title="Enviada"></i>
              ) : message.status === 'failed' ? (
                <i className="bi bi-exclamation-circle text-red-500 text-xs" title={message.failureReason || 'Falha'}></i>
              ) : (
                <i className="bi bi-clock text-slate-400 text-[9px]"></i>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Modal Lightbox para Zoom de Imagens */}
      {isMediaModalOpen && mediaUrl && (
        <div
          onClick={() => setIsMediaModalOpen(false)}
          className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={mediaUrl}
              alt="Visualização da imagem"
              className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setIsMediaModalOpen(false)}
              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
