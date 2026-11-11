import React from 'react';
import { WhatsAppMessage } from '../../../types';

interface MessageBubbleStatusProps {
  status: WhatsAppMessage['status'];
  failureReason?: string | null;
}

export const MessageBubbleStatus: React.FC<MessageBubbleStatusProps> = ({
  status,
  failureReason,
}) => {
  return (
    <span className="ml-0.5 inline-flex items-center">
      {status === 'sending' ? (
        <i className="bi bi-arrow-repeat text-amber-600 text-[10px] animate-spin" title="Enviando sugestão" />
      ) : status === 'suggested' ? (
        <i className="bi bi-clock text-amber-600 text-[9px]" title="Aguardando aprovação" />
      ) : status === 'read' ? (
        <i className="bi bi-check-all text-[#53bdeb] text-xs font-black" title="Lida"></i>
      ) : status === 'delivered' ? (
        <i className="bi bi-check-all text-slate-400 text-xs font-bold" title="Entregue"></i>
      ) : status === 'sent' ? (
        <i className="bi bi-check text-slate-400 text-xs" title="Enviada"></i>
      ) : status === 'failed' ? (
        <i
          className="bi bi-exclamation-circle-fill text-red-500 text-xs"
          title={failureReason || 'Falha de entrega'}
        ></i>
      ) : (
        <i className="bi bi-clock text-slate-400 text-[9px]" title="Pendente"></i>
      )}
    </span>
  );
};
