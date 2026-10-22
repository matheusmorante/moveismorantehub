import React from 'react';
import type { NavMenuProps } from '../navTypes';
import NavDropdown from '../NavDropdown';
import DropdownGroup from '../DropdownGroup';
import DropdownItem from '../DropdownItem';

export const FinanceNavMenu: React.FC<Required<NavMenuProps>> = ({
  activeMenu,
  setActiveMenu,
  permissions,
}) => {
  const close = () => setActiveMenu(null);

  const betaBadge = permissions.canSeeFinanceBeta ? (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
      Beta
    </span>
  ) : null;

  return (
    <NavDropdown
      menuKey="finance"
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      icon="bi bi-wallet2"
      label="Financeiro"
      disabled={!permissions.canUseFinance}
      disabledTooltip="Em beta: disponível somente para administradores."
      betaBadge={betaBadge}
    >
      <DropdownGroup title="Operação" />
      {permissions.canViewFinanceTransactions && (
        <DropdownItem
          to="/finance/transactions"
          icon="bi-arrow-left-right"
          title="Movimentações"
          description="Lançamentos financeiros"
          onClick={close}
        />
      )}
      {permissions.canViewFinancePayables && (
        <DropdownItem
          to="/finance/payables"
          icon="bi-box-arrow-up-right"
          title="Contas a pagar"
          description="Compromissos financeiros"
          onClick={close}
        />
      )}
      {permissions.canViewFinanceReceivables && (
        <DropdownItem
          to="/finance/receivables"
          icon="bi-box-arrow-in-down-left"
          title="Contas a receber"
          description="Recebimentos pendentes"
          onClick={close}
        />
      )}
      {permissions.canViewFinanceSettings && (
        <DropdownItem
          to="/finance/settings"
          icon="bi-gear"
          title="Configurações"
          description="Preferências financeiras"
          onClick={close}
        />
      )}
    </NavDropdown>
  );
};

export default FinanceNavMenu;
