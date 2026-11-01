import React, { useEffect, useRef } from 'react';
import type { ExecutedToolRecord } from '@/services/aiAgent/geminiAgentTypes';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  executedTools?: ExecutedToolRecord[];
}

interface AIChatAssistantMessagesProps {
  messages: ChatMessage[];
  aiAvatar: string;
  aiName: string;
  isLoading: boolean;
  isOpen: boolean;
  mode: 'drawer' | 'floating';
}

export function AIChatAssistantMessages({
  messages,
  aiAvatar,
  aiName,
  isLoading,
  isOpen,
  mode,
}: AIChatAssistantMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen, isLoading, mode]);

  const padding = mode === 'drawer' ? 'p-4 sm:p-5' : 'p-5';

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto ${padding} flex flex-col gap-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/30`}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
        >
          <div
            className={`flex gap-3 max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex flex-shrink-0 items-center justify-center overflow-hidden mt-1 shadow-sm">
                {aiAvatar ? (
                  <img src={aiAvatar} alt={aiName} className="w-full h-full object-cover" />
                ) : (
                  <i className="bi bi-robot text-indigo-600 dark:text-indigo-400 text-sm"></i>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {msg.executedTools && msg.executedTools.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-1">
                  {msg.executedTools.map((tool, tIdx) => (
                    <div
                      key={tIdx}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                        tool.success
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40'
                      }`}
                    >
                      <i
                        className={`bi ${tool.success ? 'bi-check2-circle' : 'bi-exclamation-triangle-fill'}`}
                      ></i>
                      <span>{tool.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-200 dark:shadow-none font-medium'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {msg.role === 'assistant'
                    ? msg.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={i} className="font-black text-indigo-700 dark:text-indigo-400">
                            {part.slice(2, -2)}
                          </strong>
                        ) : (
                          part
                        )
                      )
                    : msg.content}
                </div>
              </div>
            </div>
          </div>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}

      {isLoading && (
        <div role="status" className="flex items-start gap-2 animate-pulse">
          <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            </div>
            <span className="text-[11px] font-bold text-slate-400">Pensando e consultando ERP...</span>
          </div>
        </div>
      )}
    </div>
  );
}
