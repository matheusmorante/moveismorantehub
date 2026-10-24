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
  const hasOperations =
    permissions.canViewOrdersList ||
    permissions.canViewBudgets ||
    permissions.canViewAssistanceOrders ||
    permissions.canViewReturns;
  const hasFiscal = permissions.canViewFiscalOutbound;
  const hasReports = permissions.canViewSalesReports;

  return (
    <NavDropdown
      menuKey="salesOrder"
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      icon="bi bi-cart-fill"
      label="Vendas"
    >
      {hasOperations && (
        <>
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
              icon="bi bi-wrench-adjustable"
              iconColor="text-orange-500"
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
        </>
      )}

      {hasFiscal && (
        <>
          {hasOperations && <DropdownSeparator />}
          <DropdownGroup title="Fiscal" />
          <DropdownItem
            to="/fiscal-documents"
            icon="bi-receipt"
            title="NF de saída"
            description="Notas emitidas e pendências fiscais"
            onClick={close}
          />
        </>
      )}

      {hasReports && (
        <>
          {(hasOperations || hasFiscal) && <DropdownSeparator />}
          <DropdownGroup title="Relatórios" />
          <DropdownItem
            to="/sales-order/reports"
            icon="bi-bar-chart-fill"
            title="Relatório de vendas"
            description="Exportação CSV"
            onClick={close}
          />
        </>
      )}
    </NavDropdown>
  );
};

export default SalesNavMenu;
