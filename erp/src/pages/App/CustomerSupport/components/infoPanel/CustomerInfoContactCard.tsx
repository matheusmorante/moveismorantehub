import React from 'react';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import type { WhatsAppConversation } from '../../types';

export interface CustomerInfoContactCardProps {
  conversation: WhatsAppConversation;
}

export const CustomerInfoContactCard: React.FC<CustomerInfoContactCardProps> = ({ conversation }) => {
  const customer = conversation.customer;
  const isLinked = Boolean(conversation.customerId && customer);
  const displayName = conversation.contactName?.trim() || formatPhoneForDisplay(conversation.contactPhone);
  const initials = conversation.contactName?.trim()
    ? conversation.contactName
        .trim()
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : null;

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-800/30">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200/60 bg-gradient-to-tr from-slate-200 to-slate-100 text-sm font-bold text-slate-700 shadow-xs dark:border-slate-700 dark:from-slate-700 dark:to-slate-600 dark:text-slate-200">
        {initials || <i className="bi bi-person text-base text-slate-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{displayName}</h4>
        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {formatPhoneForDisplay(conversation.contactPhone)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${
          isLinked
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}
      >
        {isLinked ? 'Cliente ERP' : 'Não vinculado'}
      </span>
    </div>
  );
};
