import React from 'react';
import type { NavMenuProps } from '../navTypes';
import NavDropdown from '../NavDropdown';
import DropdownGroup from '../DropdownGroup';
import DropdownItem from '../DropdownItem';

export const FiscalNavMenu: React.FC<Required<NavMenuProps>> = ({
  activeMenu,
  setActiveMenu,
  permissions,
}) => {
  const close = () => setActiveMenu(null);

  return (
    <NavDropdown
      menuKey="fiscal"
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      icon="bi bi-receipt-cutoff"
      label="Fiscal"
    >
      <DropdownGroup title="Documentos e cadastros" />
      {permissions.canViewFiscalOutbound && (
        <DropdownItem
          to="/fiscal-documents"
          icon="bi-receipt"
          title="Notas fiscais de saída"
          description="NF-e e NFC-e"
          onClick={close}
        />
      )}
      {permissions.canViewInboundFiscal && (
        <DropdownItem
          to="/estoque/notas-fiscais-entrada"
          icon="bi-receipt-cutoff"
          title="Notas de entrada"
          description="Manifestação e importação XML"
          onClick={close}
        />
      )}
      {permissions.canViewNcmCatalog && (
        <DropdownItem
          to="/estoque/ncm"
          icon="bi-journal-text"
          title="NCM"
          description="Tabela oficial e revisão de produtos"
          onClick={close}
        />
      )}
    </NavDropdown>
  );
};

export default FiscalNavMenu;
