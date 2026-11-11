import React, { useState } from 'react';
import type { WhatsAppMessage } from '../../../types';
import type { CustomerSupportSendResult } from '@/pages/utils/customerSupport/customerSupportService';

interface MessageBubbleAiSuggestionActionsProps {
  message: WhatsAppMessage;
  onApprove: (message: WhatsAppMessage) => Promise<CustomerSupportSendResult>;
  onAccepted: (result: CustomerSupportSendResult) => void;
}

export const MessageBubbleAiSuggestionActions: React.FC<MessageBubbleAiSuggestionActionsProps> = ({
  message,
  onApprove,
  onAccepted,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="mt-2.5 pt-2 border-t border-orange-200/80 dark:border-orange-800/50 flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={isSending}
        aria-label="Aceitar e enviar sugestão de IA"
        title="Aceitar e enviar"
        onClick={async (e) => {
          e.stopPropagation();
          if (isSending) return;
          setIsSending(true);
          setError('');
          try {
            const result = await onApprove(message);
            if (result.accepted !== true) throw new Error('O WhatsApp não confirmou o envio.');
            onAccepted(result);
          } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : 'Não foi possível enviar a sugestão.');
          } finally {
            setIsSending(false);
          }
        }}
        className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm transition-colors cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-wait"
      >
        <i className={isSending ? 'bi bi-arrow-repeat animate-spin' : 'bi bi-check-lg'} aria-hidden="true" />
      </button>
      {error && <span role="alert" className="max-w-64 text-right text-[10px] leading-tight text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
};
