import React, { useEffect, useRef, useState } from 'react';
import { useCustomerSupportMedia } from '../../../hooks/useCustomerSupportMedia';
import type { WhatsAppMessage } from '../../../types';
import { MediaLoadStatus } from '../../chat/bubble/MediaLoadStatus';

const ATTACHMENT_LABELS: Partial<Record<WhatsAppMessage['messageType'], string>> = {
  image: 'Foto',
  document: 'Documento',
  audio: 'Áudio',
  video: 'Vídeo',
  sticker: 'Figurinha',
  template: 'Mídia de template',
};

interface CustomerMediaItemProps {
  message: WhatsAppMessage;
  onJumpToMessage: (message: WhatsAppMessage) => void;
}

export const CustomerMediaItem: React.FC<CustomerMediaItemProps> = ({
  message,
  onJumpToMessage,
}) => {
  const isImage =
    message.messageType === 'image' ||
    (message.messageType === 'template' &&
      message.rawPayload?.template_preview?.header?.type === 'image');
  const itemRef = useRef<HTMLDivElement>(null);
  const isTestEnv =
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'test' || typeof IntersectionObserver === 'undefined');
  const [loadRequested, setLoadRequested] = useState(isTestEnv);
  const { mediaUrl, isLoadingMedia, mediaError, retryMedia } = useCustomerSupportMedia(
    loadRequested ? message.mediaId : null
  );
  const label = message.mediaFilename || ATTACHMENT_LABELS[message.messageType] || 'Anexo';

  useEffect(() => {
    if (
      !isImage ||
      !message.mediaId ||
      loadRequested ||
      !itemRef.current ||
      typeof IntersectionObserver === 'undefined'
    )
      return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setLoadRequested(true);
        observer.disconnect();
      }
    });
    observer.observe(itemRef.current);
    return () => observer.disconnect();
  }, [isImage, message.mediaId, loadRequested]);

  return (
    <div
      ref={itemRef}
      className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs p-2"
    >
      <div className={isImage ? 'aspect-square' : undefined}>
        <MediaLoadStatus loading={isLoadingMedia} error={mediaError} onRetry={retryMedia} />
        {mediaUrl ? (
          <a
            href={mediaUrl}
            download={isImage ? undefined : label}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-emerald-600 dark:text-emerald-400 hover:opacity-90"
            aria-label={isImage ? 'Abrir foto compartilhada' : `Abrir ${label}`}
          >
            {isImage ? (
              <img
                src={mediaUrl}
                alt={label}
                loading="lazy"
                className="w-full aspect-square object-cover rounded-lg"
              />
            ) : (
              <span className="break-words">{label} — Abrir anexo</span>
            )}
          </a>
        ) : message.mediaId && !loadRequested ? (
          <button
            type="button"
            onClick={() => setLoadRequested(true)}
            className={`block w-full text-emerald-600 dark:text-emerald-400 ${
              isImage ? 'aspect-square' : 'text-left break-words'
            }`}
            aria-label={`Carregar ${label}`}
          >
            {isImage ? 'Carregar foto' : `${label} — Carregar anexo`}
          </button>
        ) : !isLoadingMedia && !mediaError ? (
          <p className="text-slate-500">Arquivo sem identificador de mídia disponível.</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onJumpToMessage(message)}
        className="mt-2 text-[10px] font-semibold text-blue-600 dark:text-blue-400"
      >
        Ver na conversa
      </button>
    </div>
  );
};
