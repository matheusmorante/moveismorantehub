import React from 'react';
import type { WhatsAppMessage } from '../../../types';

interface MessageBubbleMetaContextProps {
  message: WhatsAppMessage;
}

export const MessageBubbleMetaContext: React.FC<MessageBubbleMetaContextProps> = ({ message }) => {
  const isForwarded =
    message.rawPayload?.frequently_forwarded === true || message.rawPayload?.forwarded === true;
  const isFrequentlyForwarded = message.rawPayload?.frequently_forwarded === true;
  const identityNotice =
    message.rawPayload?.identity && typeof message.rawPayload.identity === 'object';
  const referral =
    message.messageType !== 'text' &&
    message.rawPayload?.referral &&
    typeof message.rawPayload.referral === 'object'
      ? (message.rawPayload.referral as Record<string, unknown>)
      : null;
  const referredProduct =
    message.messageType !== 'text' &&
    message.rawPayload?.referred_product &&
    typeof message.rawPayload.referred_product === 'object'
      ? (message.rawPayload.referred_product as Record<string, unknown>)
      : null;

  return (
    <>
      {isForwarded && (
        <span className="mb-1 flex items-center gap-1 text-[10px] italic text-slate-500 dark:text-slate-300">
          <i className="bi bi-forward-fill" aria-hidden="true" />
          {isFrequentlyForwarded ? 'Encaminhada muitas vezes' : 'Encaminhada'}
        </span>
      )}

      {identityNotice && (
        <div
          role="note"
          aria-label="Aviso de segurança do WhatsApp"
          className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <i className="bi bi-shield-exclamation mt-0.5" aria-hidden="true" />
          <span>O WhatsApp incluiu uma notificação de segurança para este contato.</span>
        </div>
      )}

      {(referral || referredProduct) && (
        <div
          role="note"
          aria-label="Contexto da mensagem"
          className="mb-2 space-y-0.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] text-slate-600 dark:bg-slate-900/60 dark:text-slate-300"
        >
          {referredProduct?.product_retailer_id && (
            <p>Produto consultado: {String(referredProduct.product_retailer_id)}</p>
          )}
          {referral?.headline && <p className="font-semibold">Origem: {String(referral.headline)}</p>}
          {referral?.body && <p>{String(referral.body)}</p>}
          {referral?.source_type && <p>Canal: {String(referral.source_type)}</p>}
          {referral?.source_id && <p>Referência: {String(referral.source_id)}</p>}
          {referral?.source_url && <p>Link de origem: {String(referral.source_url)}</p>}
        </div>
      )}
    </>
  );
};
