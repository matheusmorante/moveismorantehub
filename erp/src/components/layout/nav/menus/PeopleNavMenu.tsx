import React from 'react';
import type { NavMenuProps } from '../navTypes';
import NavDropdown from '../NavDropdown';
import DropdownGroup from '../DropdownGroup';
import DropdownItem from '../DropdownItem';

export const PeopleNavMenu: React.FC<Required<NavMenuProps>> = ({
  activeMenu,
  setActiveMenu,
  permissions,
}) => {
  const close = () => setActiveMenu(null);

  return (
    <NavDropdown
      menuKey="registrations"
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      icon="bi bi-people-fill"
      label="Pessoas"
    >
      <DropdownGroup title="Cadastros" />
      {permissions.canViewCustomers && (
        <DropdownItem
          to="/registrations/customers"
          icon="bi-person-fill"
          title="Clientes"
          description="Gestão de carteira"
          onClick={close}
        />
      )}
      {permissions.canViewEmployees && (
        <DropdownItem
          to="/registrations/employees"
          icon="bi-person-badge"
          title="Colaboradores"
          description="Equipe e vendedores"
          onClick={close}
        />
      )}
      {permissions.canViewCustomerDesires && (
        <DropdownItem
          to="/customers/desires"
          icon="bi-heart"
          title="Necessidades de clientes"
          description="Preferências registradas"
          onClick={close}
        />
      )}
    </NavDropdown>
  );
};

export default PeopleNavMenu;
