import React from 'react';
import { WhatsAppMessage } from '../../types';

interface CustomerMediaTabProps {
  imageMessages: WhatsAppMessage[];
  docMessages: WhatsAppMessage[];
}

export const CustomerMediaTab: React.FC<CustomerMediaTabProps> = ({
  imageMessages,
  docMessages,
}) => {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Fotos */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Fotos ({imageMessages.length})
        </span>
        {imageMessages.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-4">
            Nenhuma foto compartilhada.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {imageMessages.map((m) => {
              const src = m.mediaUrl || `/api/whatsapp-media?id=${m.mediaId}`;
              return (
                <a
                  key={m.id}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 block hover:opacity-90 transition-opacity"
                >
                  <img src={src} alt="Foto" className="w-full h-full object-cover" />
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Documentos */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Documentos ({docMessages.length})
        </span>
        {docMessages.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-4">
            Nenhum documento compartilhado.
          </p>
        ) : (
          <div className="space-y-2">
            {docMessages.map((m) => {
              const src = m.mediaUrl || `/api/whatsapp-media?id=${m.mediaId}`;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <span className="truncate max-w-[190px] font-medium text-slate-800 dark:text-slate-200">
                    {m.mediaFilename || 'Documento'}
                  </span>
                  <a
                    href={src}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px] font-bold"
                  >
                    Baixar
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
