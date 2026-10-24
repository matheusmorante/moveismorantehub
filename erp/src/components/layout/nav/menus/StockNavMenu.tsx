import React from 'react';
import type { NavMenuProps } from '../navTypes';
import NavDropdown from '../NavDropdown';
import DropdownGroup from '../DropdownGroup';
import DropdownSeparator from '../DropdownSeparator';
import DropdownItem from '../DropdownItem';
import stockGuide from '../../../../../../shared-utils/stockGuide.json';

export const StockNavMenu: React.FC<Required<NavMenuProps>> = ({
  activeMenu,
  setActiveMenu,
  permissions,
}) => {
  const close = () => setActiveMenu(null);

  const hasOperations =
    permissions.canViewStockMovements ||
    permissions.canViewStockInventory ||
    permissions.canViewStockUnavailabilities ||
    permissions.canViewStockReceipts;
  const hasFiscal = permissions.canViewInboundFiscal;
  const hasPurchases = permissions.canViewStockPurchases || permissions.canViewSuppliers;

  return (
    <NavDropdown
      menuKey="stock"
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      icon="bi bi-box-seam-fill"
      label="Estoque"
    >
      {hasOperations && (
        <>
          <DropdownGroup title="Operação" />
          {permissions.canViewStockMovements && (
            <DropdownItem
              to="/estoque/movimentacoes"
              icon="bi-arrow-left-right"
              title="Movimentações"
              description="Entradas e saídas manuais"
              onClick={close}
            />
          )}
          {permissions.canViewStockInventory && (
            <DropdownItem
              to="/estoque/inventarios"
              icon="bi-journal-check"
              title="Inventário"
              description="Contagem e ajustes"
              onClick={close}
            />
          )}
          {permissions.canViewStockUnavailabilities && (
            <DropdownItem
              to="/estoque/indisponibilidades"
              icon="bi-dash-circle-dotted"
              title="Indisponibilidades"
              description="Registro de perdas e avarias"
              onClick={close}
            />
          )}
          {permissions.canViewStockReceipts && (
            <DropdownItem
              to="/estoque/recebimentos"
              icon="bi-clipboard-check"
              title="Recebimentos"
              description="Conferência de mercadorias"
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
            to="/estoque/notas-fiscais-entrada"
            icon="bi-receipt-cutoff"
            title="NF de entrada"
            description="Notas recebidas e importadas"
            onClick={close}
          />
        </>
      )}

      {hasPurchases && (
        <>
          {(hasOperations || hasFiscal) && <DropdownSeparator />}
          <DropdownGroup title="Compras" />
          {permissions.canViewStockPurchases && (
            <DropdownItem
              to="/estoque/pedidos-compra"
              icon="bi-cart-fill"
              title="Pedidos de compra"
              description="Gestão de pedidos"
              onClick={close}
            />
          )}
          {permissions.canViewSuppliers && (
            <DropdownItem
              to="/estoque/fornecedores"
              icon="bi-truck"
              title="Fornecedores"
              description="Cadastro e gestão"
              onClick={close}
            />
          )}
        </>
      )}

      {permissions.canViewStockLabels && (
        <>
          {(hasOperations || hasFiscal || hasPurchases) && <DropdownSeparator />}
          <DropdownGroup title="Etiquetas" />
          <DropdownItem
            to="/estoque/etiquetas?category=identificacao"
            icon="bi-upc-scan"
            title="Identificação"
            description="Códigos de barras e caixas"
            onClick={close}
          />
          <DropdownItem
            to="/estoque/etiquetas?category=precos"
            icon="bi-tag-fill"
            title="Preços"
            description="Gôndolas e mostruários"
            onClick={close}
          />
        </>
      )}

      {(hasOperations || hasFiscal || hasPurchases || permissions.canViewStockLabels) && (
        <DropdownSeparator />
      )}
      <DropdownGroup title="Ajuda" />
      <a
        href={stockGuide.path}
        target="_blank"
        rel="noreferrer"
        role="menuitem"
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <i className="bi bi-journal-bookmark-fill" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-100">
            {stockGuide.title}
          </span>
          <span className="block text-[10px] text-slate-400">Recebimentos, inventário e movimentações</span>
        </span>
      </a>
    </NavDropdown>
  );
};

export default StockNavMenu;
