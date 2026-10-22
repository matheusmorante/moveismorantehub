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
      {permissions.canViewMarketingPosts && (
        <DropdownItem
          to="/marketing/posts"
          icon="bi-instagram"
          title="Gerador de prompt"
          description="Criar ideias de posts"
          onClick={close}
        />
      )}
      {permissions.canViewMetaCatalog && (
        <DropdownItem
          to="/products/meta-catalog"
          icon="bi-meta"
          title="Catálogo Meta"
          description="Integração de feed"
          onClick={close}
        />
      )}
      {permissions.canViewWhatsAppMarketplace && (
        <DropdownItem
          to="/registrations/whatsapp-marketplace"
          icon="bi-whatsapp"
          title="Marketplace WhatsApp"
          description="Catálogo do WhatsApp"
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
