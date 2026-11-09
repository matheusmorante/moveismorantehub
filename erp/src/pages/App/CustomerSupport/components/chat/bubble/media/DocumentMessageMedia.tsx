import React from 'react';
import type { WhatsAppMessage } from '../../../../types';

interface DocumentMessageMediaProps {
  message: WhatsAppMessage;
  mediaUrl: string | null;
}

export const DocumentMessageMedia: React.FC<DocumentMessageMediaProps> = ({
  message,
  mediaUrl,
}) => {
  const isPdf = message.mediaMimeType?.toLowerCase() === 'application/pdf';
  const fileType =
    message.mediaMimeType && message.mediaMimeType !== 'application/octet-stream'
      ? message.mediaMimeType.split('/')[1]?.toUpperCase() || 'ARQUIVO'
      : 'ARQUIVO';

  return (
    <div className="mb-2 flex items-center gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-black/20 border border-slate-200/60 dark:border-slate-700">
      <div
        className={
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' +
          (isPdf
            ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300')
        }
      >
        <i className={'bi ' + (isPdf ? 'bi-file-earmark-pdf-fill' : 'bi-file-earmark') + ' text-xl'}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
          {message.mediaFilename || 'Documento'}
        </p>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-mono">
          {fileType}
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
};
