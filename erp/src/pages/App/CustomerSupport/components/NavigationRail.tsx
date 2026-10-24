import React from 'react';
import { ConversationFilter } from '../types';
import { useAuth } from '@/context/AuthContext';
import { NavigationRailItem, NavigationRailFooter } from './navigationRail/index';

export interface NavigationRailProps {
  activeFilter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  unreadCountTotal: number;
  mineCountTotal?: number;
  unassignedCountTotal?: number;
  onOpenPolicy: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  isRealtimeConnected: boolean;
  isInboxSidebarOpen?: boolean;
  onToggleInboxSidebar?: () => void;
  isConversationSidebarOpen?: boolean;
  onToggleConversationSidebar?: () => void;
  isMobileViewport?: boolean;
  onResetLayout?: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeFilter,
  onFilterChange,
  unreadCountTotal,
  onOpenPolicy,
  isLoading,
  onRefresh,
  isRealtimeConnected,
  isInboxSidebarOpen = true,
  onToggleInboxSidebar,
  isConversationSidebarOpen = true,
  onToggleConversationSidebar,
  isMobileViewport = false,
  onResetLayout,
}) => {
  const { profile } = useAuth();

  const userInitials = (profile?.full_name || 'Usuário')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <aside
      aria-label="Barra de navegação da Central de Atendimento"
      className="w-[56px] lg:w-[60px] shrink-0 border-r border-slate-200/90 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/95 flex flex-col items-center justify-between py-3.5 select-none z-20 transition-colors"
    >
      {/* Topo: Logo Brand CRM + Ícones Principais */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Brand Icon */}
        <div
          title="MoranteHub CRM & Atendimento"
          className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-blue-600/20 mb-1 cursor-pointer transition-transform hover:scale-105"
        >
          <i className="bi bi-chat-quote-fill text-lg"></i>
        </div>

        <div className="w-7 h-px bg-slate-200 dark:bg-slate-800/80 my-0.5" />

        {/* Inbox (Caixa de Entrada com badge e destaque) */}
        <NavigationRailItem
          icon="bi-inbox-fill"
          title="Inbox (Caixa de Entrada e Filas)"
          isActive={true}
          badgeCount={unreadCountTotal}
          ariaLabel="Caixa de entrada"
          ariaExpanded={isInboxSidebarOpen}
          ariaControls="customer-support-inbox-panel"
          onClick={onToggleInboxSidebar}
        />

        <NavigationRailItem
          icon="bi-chat-left-text-fill"
          title="Lista de conversas"
          ariaLabel="Mostrar ou recolher lista de conversas"
          ariaExpanded={isConversationSidebarOpen}
          ariaControls="customer-support-conversations-panel"
          onClick={onToggleConversationSidebar}
        />

        {!isMobileViewport && onResetLayout && (
          <NavigationRailItem
            icon="bi-arrow-clockwise"
            title="Restaurar layout padrão"
            ariaLabel="Restaurar layout padrão"
            onClick={onResetLayout}
          />
        )}

        {/* Contatos / Clientes */}
        <NavigationRailItem
          icon="bi-person-lines-fill"
          title="Contatos e Clientes do ERP"
          isActive={activeFilter === 'linked'}
          onClick={() => onFilterChange('linked')}
        />

        {/* Política de uso da Central */}
        <NavigationRailItem
          icon="bi-shield-lock-fill"
          title="Política de envio da Central"
          onClick={onOpenPolicy}
        />
      </div>

      {/* Base: Avatar do Atendente com Dot Online + Notificações, Tracker e Realtime */}
      <NavigationRailFooter
        userInitials={userInitials}
        userName={profile?.full_name}
        userRole={profile?.role}
        onOpenPolicy={onOpenPolicy}
        isLoading={isLoading}
        onRefresh={onRefresh}
        isRealtimeConnected={isRealtimeConnected}
      />
    </aside>
  );
};
