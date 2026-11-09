import React from 'react';
import type { WhatsAppMessage } from '../../../../types';

interface UnsupportedMessageMediaProps {
  message: WhatsAppMessage;
}

export const UnsupportedMessageMedia: React.FC<UnsupportedMessageMediaProps> = ({ message }) => {
  const displayText = message.errorCode
    ? 'Mensagem não suportada pela API do WhatsApp.'
    : message.textContent || 'Mensagem não suportada pela API do WhatsApp.';
  const hasTechnicalDetails = Boolean(message.errorCode || message.failureReason || message.apiMessageId);

  return (
    <div className="mb-1 rounded-xl bg-amber-50 p-2 text-[11px] text-amber-800 dark:border dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
      <p className="flex items-start gap-2">
        <i className="bi bi-info-circle-fill mt-0.5 text-amber-500" aria-hidden="true"></i>
        <span>{displayText}</span>
      </p>
      {message.errorCode === '131051' && (
        <p className="ml-5 mt-1 text-[10px] text-amber-700 dark:text-amber-300">
          O aviso chegou sem o conteúdo original. A central não consegue recuperar a imagem, o texto nem os botões.
        </p>
      )}
      {hasTechnicalDetails && (
        <details className="ml-5 mt-1">
          <summary className="cursor-pointer select-none text-[10px] text-amber-700 dark:text-amber-300">
            Detalhes técnicos
          </summary>
          <div className="mt-1 space-y-1 break-words text-[10px] text-amber-800 dark:text-amber-200">
            {message.errorCode && (
              <p>
                <strong>Código:</strong> {message.errorCode}
              </p>
            )}
            {message.failureReason && (
              <p>
                <strong>Erro original:</strong> {message.failureReason}
              </p>
            )}
            {message.apiMessageId && (
              <p>
                <strong>ID da mensagem:</strong> <span className="font-mono">{message.apiMessageId}</span>
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
};
