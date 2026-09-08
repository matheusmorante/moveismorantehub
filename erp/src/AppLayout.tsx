import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { useTheme } from "./context/ThemeContext";
import { useAuth } from "./context/AuthContext";
import DesktopNav from "./components/layout/DesktopNav";
import MobileNav from "./components/layout/MobileNav";
import GlobalAutoScroll from "./components/shared/GlobalAutoScroll";
import NotificationBell from "./components/shared/NotificationBell";
import AssistanceOrderModal from "./pages/App/SalesOrder/AssistanceOrderModal";
import { crmIntelligenceService } from "./pages/utils/crmIntelligenceService";
import { redeConciliationService } from '@/pages/services/redeConciliationService';
import FloatingActionsHub from "./components/shared/FloatingActionsHub";
import AIChatAssistant from "./components/shared/AIChatAssistant";
import logoMorante from "./assets/logo.jpeg";

export type MenuKey = 'products' | 'stock' | 'salesOrder' | 'logistics' | 'registrations' | 'finance' | 'marketing' | 'assembly' | null;

export default function AppLayout() {
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, profile, logout, isAdmin } = useAuth();
  const [isAssistanceModalOpen, setIsAssistanceModalOpen] = useState(false);
  const [assistanceInitialData, setAssistanceInitialData] = useState<any>(null);

  useEffect(() => {
    const handleOpenAssistance = (e: any) => {
      setAssistanceInitialData(e.detail);
      setIsAssistanceModalOpen(true);
    };

    const handleRegisterDesire = async (e: any) => {
      try {
        await crmIntelligenceService.registerProductDesire(e.detail);
        toast.success(`Desejo registrado: ${e.detail.product_name} ✨`);
      } catch (err) {
        toast.error("Erro ao registrar desejo.");
      }
    };

    window.addEventListener('OPEN_ASSISTANCE_MODAL', handleOpenAssistance);
    window.addEventListener('REGISTER_CUSTOMER_DESIRE', handleRegisterDesire);
    
    return () => {
      window.removeEventListener('OPEN_ASSISTANCE_MODAL', handleOpenAssistance);
      window.removeEventListener('REGISTER_CUSTOMER_DESIRE', handleRegisterDesire);
    };
  }, []);

  useEffect(() => {
    const handleOpenAgent = () => setIsAgentOpen(true);
    window.addEventListener('morante:open-agent', handleOpenAgent);
    return () => window.removeEventListener('morante:open-agent', handleOpenAgent);
  }, []);

  useEffect(() => {
    // Polling de transações Rede a cada 30 segundos
    const syncInterval = setInterval(() => {
      redeConciliationService.syncPendingTransactions();
    }, 30000);

    // Primeira execução imediata
    redeConciliationService.syncPendingTransactions();

    return () => clearInterval(syncInterval);
  }, []);

  const isMobileAppView = (
    typeof window !== 'undefined' && (
      window.location.search.includes('auth_email') || 
      window.location.pathname.includes('/mobile') || 
      Boolean((window as any).ReactNativeWebView)
    )
  );
  const isTemplateEditor = location.pathname === '/templates/price-label' ||
    ['/templates/posts', '/marketing/posts', '/marketing'].includes(location.pathname);

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen font-['Inter',_sans-serif] transition-colors duration-300">
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

      {/* Header (Oculto no App Mobile e telas menores para evitar cabeçalho duplo) */}
      {!isMobileAppView && !isTemplateEditor && (
        <header className={`w-full glass-header px-4 lg:px-8 xl:px-12 h-14 xl:h-16 flex items-center justify-between sticky top-0 ${activeMenu ? 'z-[99999]' : 'z-50 hover:z-[99999] focus-within:z-[99999]'} shadow-premium transition-all duration-500`}>
          <div className="flex items-center gap-6 xl:gap-12 h-full">
            <button
              className="block xl:hidden p-2.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-all rounded-xl hover:bg-white dark:hover:bg-slate-900 shadow-premium-sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <i className="bi bi-list text-2xl"></i>
            </button>

            <Link to="/" className="flex items-center gap-2 lg:gap-3 flex-shrink-0 group h-full overflow-visible">
              <img src={logoMorante} alt="ERP Móveis Morante" className="h-[150%] max-h-none w-auto object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300 pointer-events-auto" />
            </Link>

            <DesktopNav activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Botão de Acesso Global ao Agente do ERP */}
            <button
              onClick={() => setIsAgentOpen(prev => !prev)}
              data-testid="agent-header-btn"
              className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all active:scale-95"
              title="Abrir Agente do ERP (Assistente Inteligente)"
            >
              <i className="bi bi-stars text-amber-300 animate-pulse"></i>
              <span className="hidden sm:inline font-black tracking-wide">Agente</span>
            </button>

            <GlobalAutoScroll />
            <NotificationBell />

            <button
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all rounded-xl hover:bg-white dark:hover:bg-slate-900 shadow-premium-sm"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-amber-500' : 'bi-moon-stars-fill text-blue-600'} text-lg`}></i>
            </button>

            {/* User Profile */}
            <div className="relative group">
              <button className="flex items-center gap-2 p-1 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-md shadow-blue-500/20">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:flex flex-col text-left mr-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight max-w-[120px] truncate">
                    {profile?.full_name || user?.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                    {isAdmin ? 'Admin' : 'Usuário'}
                  </span>
                </div>
                <i className="bi bi-chevron-down text-xs text-slate-400"></i>
              </button>

              {/* Profile Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-premium-hover border border-slate-100 dark:border-slate-800 p-2 hidden group-hover:block transition-all z-50">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{profile?.full_name || 'Usuário'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    {isAdmin ? 'Administrador' : 'Colaborador'}
                  </span>
                </div>

                <div className="p-2 space-y-1">
                  <Link
                    to="/profile"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all"
                  >
                    <i className="bi bi-person text-base"></i>
                    Meu Perfil
                  </Link>

                  {isAdmin && (
                    <>
                      <Link
                        to="/settings"
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all"
                      >
                        <i className="bi bi-gear-fill text-base"></i>
                        Configurações do ERP
                      </Link>
                      <Link
                        to="/finance/dashboard"
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all"
                      >
                        <i className="bi bi-bank2 text-lg"></i>
                        Financeiro e Rede
                      </Link>
                      
                      <a
                          href="https://expo.dev/artifacts/eas/2z1WIeabVBd27Zg66LdlZJTyjyR2v895eRnUiXwwHg0.apk"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all shadow-sm group"
                        >
                        <i className="bi bi-android2 text-blue-400"></i>
                        <span>Baixar App Android</span>
                      </a>
                    </>
                  )}
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-3 mx-4"></div>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-4 p-4 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-[1.5rem] transition-all font-bold text-[10px] uppercase tracking-widest"
                >
                  <i className="bi bi-box-arrow-right text-lg"></i>
                  Encerrar Sessão
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Mobile Nav — visível em telas < xl (< 1280px) */}
      {!isTemplateEditor && <MobileNav
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
      />}

      <main className={`flex-1 ${isTemplateEditor ? 'p-0' : isMobileAppView ? 'p-2' : 'p-3 sm:p-4 md:p-6 lg:p-6 xl:p-8'} overflow-x-clip`}>
        <Outlet />
      </main>

      {/* Hub de Ações Flutuantes */}
      <FloatingActionsHub />

      {/* Agente Geral do ERP — Drawer Lateral Global */}
      <AIChatAssistant
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
        mode="drawer"
      />

      {isAssistanceModalOpen && (
        <AssistanceOrderModal 
          onClose={() => setIsAssistanceModalOpen(false)}
          onSaveSuccess={() => {
            setIsAssistanceModalOpen(false);
          }}
          initialData={assistanceInitialData}
        />
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slide-up { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-right { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-right { animation: slide-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}
