import React from 'react';

export function getInitials(name?: string | null, fallback = ''): string {
  if (!name || !name.trim()) return fallback;
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

interface MessageBubbleAvatarProps {
  type: 'inbound' | 'outbound';
  name?: string | null;
  isAiMessage?: boolean;
}

export const MessageBubbleAvatar: React.FC<MessageBubbleAvatarProps> = ({
  type,
  name,
  isAiMessage = false,
}) => {
  if (type === 'inbound') {
    const initials = getInitials(name, 'C');
    return (
      <div
        title={name || 'Cliente'}
        className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs border border-slate-300/50 dark:border-slate-600 mb-0.5"
      >
        {initials || <i className="bi bi-person text-xs text-slate-400" />}
      </div>
    );
  }

  const initials = getInitials(name, 'M');
  return (
    <div
      title={name || (isAiMessage ? 'Lizandro (IA)' : 'Atendente')}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs border mb-0.5 ${
        isAiMessage
          ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white border-indigo-400/50 shadow-indigo-500/20'
          : 'bg-emerald-600 text-white border-emerald-700/40'
      }`}
    >
      {isAiMessage ? (
        <i className="bi bi-robot text-xs text-white" aria-hidden="true" />
      ) : (
        initials || <i className="bi bi-person text-xs text-white" />
      )}
    </div>
  );
};
