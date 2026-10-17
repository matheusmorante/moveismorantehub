import React from 'react';
import { WhatsAppMessage } from '../../../types';

interface SystemEventBubbleProps {
  message: WhatsAppMessage;
  timeFormatted: string;
}

export const SystemEventBubble: React.FC<SystemEventBubbleProps> = ({
  message,
  timeFormatted,
}) => {
  return (
    <div className="flex justify-center my-3 select-none">
      <div className="px-3.5 py-1 rounded-full bg-slate-200/90 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700/60 shadow-xs flex items-center gap-2 max-w-[90%] text-center">
        <i className="bi bi-shield-check text-blue-500 text-xs shrink-0"></i>
        <span>{message.textContent}</span>
        <span className="text-[10px] text-slate-400 font-normal ml-1">{timeFormatted}</span>
      </div>
    </div>
  );
};
