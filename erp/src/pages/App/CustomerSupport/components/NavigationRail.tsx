import React from 'react';
import { NavigationRailItem, NavigationRailFooter } from './navigationRail/index';

export interface NavigationRailProps {
  unreadCountTotal: number;
  isInboxSidebarOpen?: boolean;
  onToggleInboxSidebar?: () => void;
  isConversationSidebarOpen?: boolean;
  onToggleConversationSidebar?: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  unreadCountTotal,
  isInboxSidebarOpen = true,
  onToggleInboxSidebar,
  isConversationSidebarOpen = true,
  onToggleConversationSidebar,
}) => {
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
          className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-blue-600/20 mb-1"
        >
          <i className="bi bi-chat-quote-fill text-lg"></i>
        </div>

        <div className="w-7 h-px bg-slate-200 dark:bg-slate-800/80 my-0.5" />

        {/* Caixa de entrada com badge e destaque */}
        <NavigationRailItem
          icon="bi-inbox-fill"
          title="Caixa de entrada e filas de atendimento"
          isActive={isInboxSidebarOpen}
          badgeCount={unreadCountTotal}
          ariaLabel="Caixa de entrada"
          ariaExpanded={isInboxSidebarOpen}
          ariaControls="customer-support-inbox-panel"
          onClick={onToggleInboxSidebar}
        />

        {!isConversationSidebarOpen && (
          <NavigationRailItem
            icon="bi-chat-left-text-fill"
            title="Mostrar lista de conversas"
            ariaLabel="Mostrar lista de conversas"
            ariaExpanded={false}
            ariaControls="customer-support-conversations-panel"
            onClick={onToggleConversationSidebar}
          />
        )}
      </div>

      {/* Opções da Central */}
      <NavigationRailFooter />
    </aside>
  );
};
