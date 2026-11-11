import React from 'react';
import type { NavMenuProps } from '../navTypes';
import NavDropdown from '../NavDropdown';
import DropdownGroup from '../DropdownGroup';
import DropdownItem from '../DropdownItem';

export const MarketingNavMenu: React.FC<Required<NavMenuProps>> = ({
  activeMenu,
  setActiveMenu,
  permissions,
}) => {
  const close = () => setActiveMenu(null);

  return (
    <NavDropdown
      menuKey="marketing"
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      icon="bi bi-megaphone-fill"
      label="Marketing"
    >
      <DropdownGroup title="Criação" />
      {permissions.canManageSiteElements && (
        <DropdownItem
          to="/marketing/site-elements"
          icon="bi-images"
          title="Elementos do site"
          description="Carrossel e barra de destaque"
          onClick={close}
        />
      )}
      {permissions.canManageCatalogImageTemplates && (
        <DropdownItem
          to="/marketing/image-templates"
          icon="bi-image"
          title="Modelos de imagem"
          description="Posts com produtos do ERP"
          onClick={close}
        />
      )}
      {permissions.canViewStockLabels && (
        <DropdownItem
          to="/estoque/etiquetas?category=logos"
          icon="bi-printer-fill"
          title="Impressão de logotipos"
          description="Artes e promoções"
          onClick={close}
        />
      )}
    </NavDropdown>
  );
};

export default MarketingNavMenu;
