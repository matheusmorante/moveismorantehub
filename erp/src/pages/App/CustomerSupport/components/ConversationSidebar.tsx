import React from 'react';
import { WhatsAppConversation, ConversationFilter } from '../types';
import { ConversationItem } from './ConversationItem';
import { FreeTierUsageInfo } from '@/pages/utils/customerSupport/freeTierTracker';

interface ConversationSidebarProps {
  conversations: WhatsAppConversation[];
  selectedConversation: WhatsAppConversation | null;
  onSelectConversation: (conversation: WhatsAppConversation) => void;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  usageInfo: FreeTierUsageInfo | null;
  onOpenUsageModal: () => void;
  isLoading: boolean;
  onRefresh: () => void;
}

const FILTERS: { id: ConversationFilter; label: string; icon?: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'linked', label: 'Cadastrados' },
  { id: 'unlinked', label: 'Não identificados' },
  { id: 'with_orders', label: 'Com pedidos' },
  { id: 'without_orders', label: 'Sem pedidos' },
  { id: 'archived', label: 'Arquivadas' },
];

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  usageInfo,
  onOpenUsageModal,
  isLoading,
  onRefresh,
}) => {
  return (
    <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0">
      {/* Header da Barra Lateral */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
            <i className="bi bi-chat-dots-fill text-base"></i>
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Central de Atendimento
            </h2>
            <span className="text-[10px] text-slate-400 block font-medium">
              WhatsApp Cloud API Oficial
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Botão de Consumo / Franquia Gratuita */}
          {usageInfo && (
            <button
              onClick={onOpenUsageModal}
              title="Visualizar consumo da franquia gratuita oficial da Meta"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm transition-all active:scale-95 ${
                usageInfo.alertLevel === 'exceeded'
                  ? 'bg-red-500 text-white'
                  : usageInfo.alertLevel === 'danger'
                    ? 'bg-orange-500 text-white'
                    : usageInfo.alertLevel === 'warning'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <i className="bi bi-speedometer2 text-[10px]"></i>
              <span>{usageInfo.serviceMessagesCount}/1.000</span>
            </button>
          )}

          {/* Botão de Atualização */}
          <button
            onClick={onRefresh}
            title="Atualizar lista de conversas"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <i className={`bi bi-arrow-clockwise text-sm ${isLoading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Campo de Busca */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="relative">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar conversas, clientes ou pedidos..."
            className="w-full pl-8 pr-8 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <i className="bi bi-x-circle-fill text-xs"></i>
            </button>
          )}
        </div>
      </div>

      {/* Pílulas de Filtro Horizontal */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Lista de Conversas com Scroll */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
        {isLoading && conversations.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-[11px] text-slate-400">Carregando conversas...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <i className="bi bi-chat-left-dots text-3xl block mb-2 opacity-40"></i>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nenhuma conversa encontrada
            </p>
            <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
              {search
                ? 'Nenhum resultado corresponde à sua pesquisa.'
                : 'As conversas aparecerão automaticamente assim que mensagens forem recebidas pelo WhatsApp da empresa.'}
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedConversation?.id === conv.id}
              onSelect={onSelectConversation}
            />
          ))
        )}
      </div>
    </div>
  );
};
