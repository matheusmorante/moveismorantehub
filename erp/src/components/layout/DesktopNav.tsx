import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MenuKey } from './types';
import { useDesktopNavPermissions } from './hooks/useDesktopNavPermissions';
import { navLinkClass } from './nav/navStyles';
import {
  ProductsNavMenu,
  StockNavMenu,
  PeopleNavMenu,
  SalesNavMenu,
  FiscalNavMenu,
  LogisticsNavMenu,
  MarketingNavMenu,
  FinanceNavMenu,
} from './nav';

export interface DesktopNavProps {
  activeMenu: MenuKey;
  setActiveMenu: (menu: MenuKey) => void;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({ activeMenu, setActiveMenu }) => {
  const { profile } = useAuth();
  const permissions = useDesktopNavPermissions(profile);

  return (
    <nav className="hidden min-[1600px]:flex h-full items-center gap-2">
      {/* 1. Dashboard Principal */}
      {permissions.canViewDashboard && (
        <Link to="/" className={navLinkClass}>
          <i className="bi bi-grid-fill" />
          Dashboard
        </Link>
      )}

      {/* 2. Central de Atendimento Omnichannel */}
      {permissions.canViewCustomerSupport && (
        <Link to="/atendimento" className={navLinkClass}>
          <i className="bi bi-chat-dots-fill text-emerald-500" />
          Central de Atendimento
        </Link>
      )}

      {/* 3. Catálogo de Produtos e Integrações */}
      {permissions.canViewProductMenu && (
        <ProductsNavMenu
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          permissions={permissions}
        />
      )}

      {/* 4. Gestão de Estoque e Suprimentos */}
      {(permissions.canViewStock || permissions.canViewSuppliers) && (
        <StockNavMenu
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          permissions={permissions}
        />
      )}

      {/* 5. Gestão de Pessoas (Clientes, Colaboradores, Serviços) */}
      {permissions.canViewPeople && (
        <PeopleNavMenu
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          permissions={permissions}
        />
      )}

      {/* 6. Vendas (Pedidos, Orçamentos, Assistências, Devoluções, Relatórios) */}
      {permissions.canViewOrders && (
        <SalesNavMenu
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          permissions={permissions}
        />
      )}

      {/* 7. Módulo Fiscal (Notas de Saída, Notas de Entrada, NCM) */}
      {permissions.canViewFiscal && (
        <FiscalNavMenu
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          permissions={permissions}
        />
      )}

      {/* 8. Logística e Agendamentos */}
      {permissions.canViewLogistics && (
        <LogisticsNavMenu
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          permissions={permissions}
        />
      )}

      {/* 9. Marketing e Redes */}
      {(permissions.canViewMarketing || permissions.canViewStockLabels) && (
        <MarketingNavMenu
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          permissions={permissions}
        />
      )}

      {/* 10. Módulo Financeiro */}
      {(permissions.canUseFinance || permissions.canSeeFinanceBeta) && (
        <FinanceNavMenu
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          permissions={permissions}
        />
      )}
    </nav>
  );
};

export default DesktopNav;
