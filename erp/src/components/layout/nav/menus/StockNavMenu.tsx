import React from 'react';
import type { NavMenuProps } from '../navTypes';
import NavDropdown from '../NavDropdown';
import DropdownGroup from '../DropdownGroup';
import DropdownSeparator from '../DropdownSeparator';
import DropdownItem from '../DropdownItem';

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

      {(permissions.canViewStockPurchases || permissions.canViewSuppliers) && (
        <>
          {permissions.canViewStock && <DropdownSeparator />}
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
          {(permissions.canViewStock || permissions.canViewSuppliers) && <DropdownSeparator />}
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
    </NavDropdown>
  );
};

export default StockNavMenu;
