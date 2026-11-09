import React from 'react';

interface MessageBubbleReactionsProps {
  reactions?: string[];
}

export const MessageBubbleReactions: React.FC<MessageBubbleReactionsProps> = ({ reactions }) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div role="list" aria-label="Reações à mensagem" className="mt-1 flex flex-wrap gap-1">
      {reactions.map((emoji, index) => (
        <span
          key={emoji + index}
          role="listitem"
          aria-label={'Reação ' + emoji}
          className="inline-flex min-h-6 items-center rounded-full bg-white px-1.5 text-sm shadow-sm dark:bg-slate-800"
        >
          {emoji}
        </span>
      ))}
    </div>
  );
};
