import React from 'react';
import type { NavMenuProps } from '../navTypes';
import NavDropdown from '../NavDropdown';
import DropdownGroup from '../DropdownGroup';
import DropdownSeparator from '../DropdownSeparator';
import DropdownItem from '../DropdownItem';

export const SalesNavMenu: React.FC<Required<NavMenuProps>> = ({
  activeMenu,
  setActiveMenu,
  permissions,
}) => {
  const close = () => setActiveMenu(null);

  return (
    <NavDropdown
      menuKey="salesOrder"
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      icon="bi bi-cart-fill"
      label="Vendas"
    >
      <DropdownGroup title="Operação" />
      {permissions.canViewOrdersList && (
        <DropdownItem
          to="/sales-order"
          icon="bi-cart-fill"
          title="Pedidos de venda"
          description="Gerenciar pedidos"
          onClick={close}
        />
      )}
      {permissions.canViewBudgets && (
        <DropdownItem
          to="/budgets"
          icon="bi-file-text"
          title="Orçamentos"
          description="Propostas e negociações"
          onClick={close}
        />
      )}
      {permissions.canViewAssistanceOrders && (
        <DropdownItem
          to="/assistance-orders"
          icon="bi-tools"
          iconColor="text-amber-500 dark:text-amber-400"
          title="Assistências"
          description="Garantias e reparos"
          onClick={close}
        />
      )}
      {permissions.canViewReturns && (
        <DropdownItem
          to="/returns"
          icon="bi-arrow-return-left"
          iconColor="text-orange-500"
          title="Devoluções"
          description="Trocas e devoluções"
          onClick={close}
        />
      )}

      {permissions.canViewSalesReports && (
        <>
          <DropdownSeparator />
          <DropdownGroup title="Relatórios" />
          <DropdownItem
            to="/sales-order/reports"
            icon="bi-bar-chart-fill"
            title="Relatório de vendas"
            description="Exportação CSV"
            onClick={close}
          />
          <DropdownItem
            to="/sales-order/reports-bling"
            icon="bi-clouds-fill"
            title="Relatórios Bling"
            description="Integração externa"
            beta={true}
            onClick={close}
          />
        </>
      )}
    </NavDropdown>
  );
};

export default SalesNavMenu;
