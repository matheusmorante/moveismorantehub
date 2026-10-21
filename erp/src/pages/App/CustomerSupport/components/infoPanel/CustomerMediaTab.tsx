import React from 'react';
import { WhatsAppMessage } from '../../types';
import { useCustomerSupportMedia } from '../../hooks/useCustomerSupportMedia';
import { MediaLoadStatus } from '../chat/bubble/MediaLoadStatus';

interface CustomerMediaTabProps {
  imageMessages: WhatsAppMessage[];
  docMessages: WhatsAppMessage[];
}

function CustomerMediaItem({ message, image }: { message: WhatsAppMessage; image: boolean }) {
  const { mediaUrl, isLoadingMedia, mediaError, retryMedia } = useCustomerSupportMedia(message.mediaId);
  return (
    <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs p-2">
      <MediaLoadStatus loading={isLoadingMedia} error={mediaError} onRetry={retryMedia} />
      {mediaUrl ? (
        <a href={mediaUrl} download={image ? undefined : message.mediaFilename || 'documento'}
          target="_blank" rel="noopener noreferrer"
          className="block text-emerald-600 dark:text-emerald-400 hover:opacity-90"
          aria-label={image ? 'Abrir foto' : `Baixar ${message.mediaFilename || 'documento'}`}>
          {image ? <img src={mediaUrl} alt="Foto compartilhada" loading="lazy" className="w-full aspect-square object-cover rounded-lg" />
            : <span className="break-words">{message.mediaFilename || 'Documento'} — Baixar</span>}
        </a>
      ) : !isLoadingMedia && !mediaError ? (
        <p className="text-slate-500">Arquivo sem identificador de mídia disponível.</p>
      ) : null}
    </div>
  );
}

export const CustomerMediaTab: React.FC<CustomerMediaTabProps> = ({ imageMessages, docMessages }) => (
  <div className="space-y-4 animate-fade-in">
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
        Fotos ({imageMessages.length})
      </span>
      {imageMessages.length === 0 ? <p className="text-slate-400 text-xs text-center py-4">Nenhuma foto compartilhada.</p> : (
        <div className="grid grid-cols-3 gap-2">
          {imageMessages.map((message) => <CustomerMediaItem key={message.id} message={message} image />)}
        </div>
      )}
    </div>
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
        Documentos ({docMessages.length})
      </span>
      {docMessages.length === 0 ? <p className="text-slate-400 text-xs text-center py-4">Nenhum documento compartilhado.</p> : (
        <div className="space-y-2">
          {docMessages.map((message) => <CustomerMediaItem key={message.id} message={message} image={false} />)}
        </div>
      )}
    </div>
  </div>
);
