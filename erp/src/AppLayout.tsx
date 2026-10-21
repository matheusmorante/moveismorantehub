import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import {
  MenuKey,
  AppHeader,
  MobileNav,
  SupabaseAnomalyBanner,
  ActiveRoleBanner,
  useLayoutRoutes,
  useGlobalAppEvents,
} from './components/layout';
import FloatingActionsHub from './components/shared/FloatingActionsHub';
import AIChatAssistant from './components/shared/AIChatAssistant';
import AssistanceOrderModal from './pages/App/SalesOrder/modals/AssistanceOrderModal';

export type { MenuKey } from './components/layout/types';

export default function AppLayout() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme } = useTheme();
  const { isAdmin, activeRoleMode, setActiveRoleMode } = useAuth();

  const { isMobileAppView, isTemplateEditor, isCustomerSupport, mainContentClassName } =
    useLayoutRoutes();

  const {
    isAgentOpen,
    setIsAgentOpen,
    isAssistanceModalOpen,
    setIsAssistanceModalOpen,
    assistanceInitialData,
    anomaly,
    setAnomaly,
  } = useGlobalAppEvents({ isAdmin });

  return (
    <div className={`flex flex-col bg-slate-50 dark:bg-slate-950 ${isCustomerSupport ? 'h-dvh overflow-hidden' : 'min-h-screen'} font-['Inter',_sans-serif] transition-colors duration-300`}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        theme={theme === 'dark' ? 'dark' : 'colored'}
        style={{ marginTop: '65px', zIndex: 9999999 }}
        className="!z-[9999999]"
        draggable
      />

      {/* Top Banner Alertas Supabase (Admin Only) */}
      {isAdmin && !isMobileAppView && !isTemplateEditor && (
        <SupabaseAnomalyBanner anomaly={anomaly} onDismiss={() => setAnomaly(null)} />
      )}

      {/* Header (Oculto no App Mobile e editores de template) */}
      {!isMobileAppView && !isTemplateEditor && (
        <AppHeader
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />
      )}

      {/* Mobile Nav — visível em telas menores quando aberto */}
      {!isTemplateEditor && (
        <MobileNav
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
        />
      )}

      {/* Banner de Simulação de Cargo */}
      <ActiveRoleBanner
        activeRoleMode={activeRoleMode}
        onExitRoleMode={() => setActiveRoleMode(null)}
      />

      {/* Conteúdo Principal das Rotas */}
      <main className={`flex-1 ${isCustomerSupport ? 'min-h-0' : ''} ${mainContentClassName} overflow-x-clip`}>
        <Outlet />
      </main>

      {/* Hub de Ações Flutuantes (oculto no Atendimento para não sobrepor chat) */}
      {!isCustomerSupport && <FloatingActionsHub />}

      {/* Drawer Lateral Global do Assistente IA */}
      <AIChatAssistant isOpen={isAgentOpen} onClose={() => setIsAgentOpen(false)} mode="drawer" />

      {/* Modal Global de Ordem de Assistência Técnica */}
      {isAssistanceModalOpen && (
        <AssistanceOrderModal
          onClose={() => setIsAssistanceModalOpen(false)}
          onSaveSuccess={() => setIsAssistanceModalOpen(false)}
          initialData={assistanceInitialData}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes slide-up { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-right { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-right { animation: slide-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `,
        }}
      />
    </div>
  );
}
