import React from 'react';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import type { WhatsAppConversation } from '../../../types';
import { recipientBlockReason } from './forwardHelpers';

interface ForwardConversationItemProps {
  conversation: WhatsAppConversation;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (conversationId: string) => void;
}

export const ForwardConversationItem: React.FC<ForwardConversationItemProps> = ({
  conversation,
  isSelected,
  isDisabled,
  onSelect,
}) => {
  const blockedReason = recipientBlockReason(conversation);
  const name =
    conversation.customer?.fullName ||
    conversation.contactName ||
    formatPhoneForDisplay(conversation.contactPhone);

  return (
    <button
      type="button"
      disabled={Boolean(blockedReason) || isDisabled}
      aria-pressed={isSelected}
      onClick={() => onSelect(conversation.id)}
      className={`w-full rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold">{name}</span>
        <span className="shrink-0 text-[10px] text-slate-500">
          {formatPhoneForDisplay(conversation.contactPhone)}
        </span>
      </span>
      <span className="mt-1 block text-[10px] text-slate-500">
        {blockedReason || 'Pronto para receber'}
      </span>
    </button>
  );
};
