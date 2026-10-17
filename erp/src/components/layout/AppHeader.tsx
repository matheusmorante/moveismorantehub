import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import DesktopNav from './DesktopNav';
import ProfileDropdown from './ProfileDropdown';
import GlobalAutoScroll from '../shared/GlobalAutoScroll';
import NotificationBell from '../shared/NotificationBell';
import AiQuotaHeaderNotice from '../shared/AiQuotaHeaderNotice';
import logoMoranteHorizontal from '../../assets/logo-morante-horizontal.svg';
import logoMoranteMark from '../../assets/brand-mark.svg';
import { MenuKey } from './types';

interface AppHeaderProps {
  activeMenu: MenuKey;
  setActiveMenu: (menu: MenuKey) => void;
  onToggleMobileMenu: () => void;
}

export default function AppHeader({
  activeMenu,
  setActiveMenu,
  onToggleMobileMenu,
}: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative z-[99999]">
      <AiQuotaHeaderNotice />
      <header className="w-full glass-header px-4 lg:px-8 xl:px-12 h-14 xl:h-16 flex items-center justify-between z-[99999] shadow-premium transition-all duration-500">
        <div className="flex items-center gap-6 xl:gap-12 h-full">
          <button
            type="button"
            aria-label="Abrir menu de navegação"
            className="block min-[1600px]:hidden rounded-xl p-2.5 text-slate-500 shadow-premium-sm transition-all hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-blue-400 cursor-pointer"
            onClick={onToggleMobileMenu}
          >
            <i className="bi bi-list text-2xl"></i>
          </button>

          <Link
            to="/"
            className="flex items-center gap-2 lg:gap-3 flex-shrink-0 group h-full overflow-visible"
          >
            <picture>
              <source media="(max-width: 639px)" srcSet={logoMoranteMark} />
              <img
                src={logoMoranteHorizontal}
                alt="ERP Móveis Morante"
                className="h-10 md:h-12 w-auto max-w-[240px] object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300 pointer-events-auto"
              />
            </picture>
          </Link>

          <DesktopNav activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <GlobalAutoScroll />
          <NotificationBell />

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all rounded-xl hover:bg-white dark:hover:bg-slate-900 shadow-premium-sm cursor-pointer"
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            <i
              className={`bi ${
                theme === 'dark' ? 'bi-sun-fill text-amber-500' : 'bi-moon-stars-fill text-blue-600'
              } text-lg`}
            ></i>
          </button>

          <ProfileDropdown />
        </div>
      </header>
    </div>
  );
}
