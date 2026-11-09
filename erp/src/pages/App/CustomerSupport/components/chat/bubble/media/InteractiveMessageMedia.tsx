import React from 'react';
import type { WhatsAppMessage } from '../../../../types';

interface InteractiveMessageMediaProps {
  message: WhatsAppMessage;
}

export const InteractiveMessageMedia: React.FC<InteractiveMessageMediaProps> = ({ message }) => {
  const reactionEmoji =
    typeof message.rawPayload?.reaction?.emoji === 'string'
      ? message.rawPayload.reaction.emoji
      : message.textContent?.match(/^Reação (.+) a uma mensagem$/u)?.[1] || '';
  const isReaction =
    message.rawPayload?.provider_message_type === 'reaction' ||
    Boolean(reactionEmoji) ||
    message.textContent === 'Reação removida de uma mensagem';

  if (isReaction) {
    return (
      <p className="mb-1 flex items-center gap-2 rounded-full bg-black/5 px-2 py-1 text-[12px] dark:bg-white/10">
        <span className="text-lg" aria-hidden="true">
          {reactionEmoji || '↩️'}
        </span>
        <span>{reactionEmoji ? 'Reação à mensagem citada' : 'Reação removida da mensagem'}</span>
      </p>
    );
  }

  return (
    <div className="mb-1 whitespace-pre-wrap break-words p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 font-medium">
      {message.textContent}
    </div>
  );
};
