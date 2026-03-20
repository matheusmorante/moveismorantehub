import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useTheme } from "./context/ThemeContext";
import { useAuth } from "./context/AuthContext";
import DesktopNav from "./components/layout/DesktopNav";
import MobileNav from "./components/layout/MobileNav";
import AIChatAssistant from "./components/shared/AIChatAssistant";
import AttendanceVoiceInput from "./components/shared/AttendanceVoiceInput";
import GlobalAutoScroll from "./components/shared/GlobalAutoScroll";
import NotificationBell from "./components/shared/NotificationBell";
import AssistanceOrderModal from "./pages/App/SalesOrder/AssistanceOrderModal";
import { toast } from "react-toastify";
import { crmIntelligenceService } from "./pages/utils/crmIntelligenceService";
import { useEffect } from "react";
import { redeConciliationService } from '@/pages/services/redeConciliationService';
import logoMorante from "./assets/logo.jpeg";

export type MenuKey = 'products' | 'stock' | 'salesOrder' | 'registrations' | 'finance' | 'marketing' | null;

export default function AppLayout() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    // Polling de transações Rede a cada 30 segundos
    const syncInterval = setInterval(() => {
      redeConciliationService.syncPendingTransactions();
    }, 30000);

    // Primeira execução imediata
    redeConciliationService.syncPendingTransactions();

    return () => clearInterval(syncInterval);
  }, []);

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen font-['Inter',_sans-serif] transition-colors duration-300">
      <GlobalAutoScroll />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        theme={theme === 'dark' ? 'dark' : 'colored'}
        draggable
      />

      {/* Header */}
      <header className="w-full glass-header px-4 xl:px-12 h-14 xl:h-16 flex items-center justify-between sticky top-0 z-50 shadow-premium transition-all duration-500">
        <div className="flex items-center gap-6 xl:gap-12 h-full">
          <button
            className="xl:hidden p-2.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-all rounded-xl hover:bg-white dark:hover:bg-slate-900 shadow-premium-sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <i className="bi bi-list text-2xl"></i>
          </button>

          <Link to="/" className="flex items-center gap-3 lg:gap-5 flex-shrink-0 group">
            <div className="w-9 h-9 lg:w-11 lg:h-11 bg-white rounded-full shadow-premium border border-white/20 dark:border-slate-800 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
              <img src={logoMorante} alt="ERP Móveis Morante" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-xs lg:text-sm font-black text-slate-800 dark:text-slate-100 tracking-tighter block uppercase italic whitespace-nowrap leading-none">ERP <span className="text-blue-600">Móveis Morante</span></h3>
              <span className="text-[8px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase mt-1 animate-reveal">Hub de Inteligência</span>
            </div>
          </Link>

          <DesktopNav activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        </div>

        <div className="flex items-center gap-3 lg:gap-8">
          <div className="flex items-center gap-2 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <NotificationBell />
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-yellow-400 transition-all rounded-xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-premium-sm"
              title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
            >
              {theme === 'light' ? (
                <i className="bi bi-moon-stars-fill text-base"></i>
              ) : (
                <i className="bi bi-sun-fill text-base"></i>
              )}
            </button>
          </div>

          {/* Dropdown de Perfil */}
          <div className="relative group">
            <button className="flex items-center gap-3 p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-[1.25rem] transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 hover:shadow-premium-sm active:scale-95">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-premium flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-sm uppercase">
                    {((profile?.full_name || user?.email || 'U') as any)[0]}
                  </span>
                )}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Conta Master</p>
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                  {((profile?.full_name || 'Usuário') as any).split(' ')[0]}
                </p>
              </div>
              <i className="bi bi-chevron-down text-[10px] text-slate-400 group-hover:rotate-180 transition-transform hidden xl:block ml-1"></i>
            </button>

            {/* Menu Dropdown */}
            <div className="absolute top-full pt-2 right-0 w-64 opacity-0 scale-95 origin-top-right translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-500 z-[60]">
              <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-premium-lg p-3 backdrop-blur-2xl">
                <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-100 dark:border-slate-800/50 mb-3 text-center">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1">{profile?.full_name || 'Usuário'}</p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
                  <div className="mt-3 inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {isAdmin ? 'Administrador' : 'Vendedor'}
                  </div>
                </div>

                <div className="space-y-1">
                  <Link to="/profile" className="flex items-center gap-4 p-4 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 rounded-[1.5rem] transition-all font-bold text-[10px] uppercase tracking-widest">
                    <i className="bi bi-person-circle text-lg"></i>
                    Meu Perfil
                  </Link>

                  {isAdmin && (
                    <>
                      <Link to="/settings" className="flex items-center gap-4 p-4 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 rounded-[1.5rem] transition-all font-bold text-[10px] uppercase tracking-widest">
                        <i className="bi bi-gear-fill text-lg"></i>
                        Ajustes Gerais
                      </Link>
                      <Link to="/finance/settings" className="flex items-center gap-4 p-4 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 rounded-[1.5rem] transition-all font-bold text-[10px] uppercase tracking-widest">
                        <i className="bi bi-bank2 text-lg"></i>
                        Financeiro e Rede
                      </Link>
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
        </div>
      </header>


      {/* Mobile Nav */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <main className="flex-1 p-4 xl:p-8 overflow-x-hidden">
        <Outlet />
      </main>

      <AIChatAssistant />
      <AttendanceVoiceInput />

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
