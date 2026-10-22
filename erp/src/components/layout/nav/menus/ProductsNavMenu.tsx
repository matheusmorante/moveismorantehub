import React from 'react';
import type { NavMenuProps } from '../navTypes';
import NavDropdown from '../NavDropdown';
import DropdownGroup from '../DropdownGroup';
import DropdownSeparator from '../DropdownSeparator';
import DropdownItem from '../DropdownItem';

export const ProductsNavMenu: React.FC<Required<NavMenuProps>> = ({
  activeMenu,
  setActiveMenu,
  permissions,
}) => {
  const close = () => setActiveMenu(null);

  return (
    <NavDropdown
      menuKey="products"
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      icon="bi bi-box-seam"
      label="Produtos"
    >
      <DropdownGroup title="Catálogo" />
      {permissions.canViewProducts && (
        <DropdownItem
          to="/products"
          icon="bi-list-ul"
          title="Cadastros"
          description="Gerenciar Cadastros de Produtos"
          onClick={close}
        />
      )}
      {(permissions.canViewProductCharacteristics || permissions.canViewProductCategories) && (
        <>
          {permissions.canViewProductCharacteristics && (
            <DropdownItem
              to="/products/characteristics"
              icon="bi-sliders2"
              title="Características"
              description="Cores, medidas e características"
              onClick={close}
            />
          )}
          {permissions.canViewProductCategories && (
            <DropdownItem
              to="/products/categories"
              icon="bi-tag-fill"
              title="Ambientes e categorias"
              description="Agrupamentos de catálogo"
              onClick={close}
            />
          )}
        </>
      )}
      {(permissions.canViewProductReconciliation || permissions.canViewMetaCatalog) && (
        <>
          <DropdownSeparator />
          <DropdownGroup title="Integração" />
          {permissions.canViewProductReconciliation && (
            <DropdownItem
              to="/products/reconciliation/suppliers"
              icon="bi-magic"
              title="Conciliação de fornecedores"
              description="Sincronizar base externa"
              onClick={close}
            />
          )}
          {permissions.canViewMetaCatalog && (
            <DropdownItem
              to="/products/meta-catalog"
              icon="bi-meta"
              title="Sincronizar Catálogo"
              description="Produtos e composições na Meta"
              onClick={close}
            />
          )}
        </>
      )}
    </NavDropdown>
  );
};

export default ProductsNavMenu;
