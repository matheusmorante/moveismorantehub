import React from 'react';
import type { NavMenuProps } from '../navTypes';
import NavDropdown from '../NavDropdown';
import DropdownGroup from '../DropdownGroup';
import DropdownSeparator from '../DropdownSeparator';
import DropdownItem from '../DropdownItem';

export const LogisticsNavMenu: React.FC<Required<NavMenuProps>> = ({
  activeMenu,
  setActiveMenu,
  permissions,
}) => {
  const close = () => setActiveMenu(null);

  return (
    <NavDropdown
      menuKey="logistics"
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      icon="bi bi-truck"
      label="Logística"
    >
      <DropdownGroup title="Operação" />
      {permissions.canViewDeliverySchedule && (
        <DropdownItem
          to="/delivery-schedule"
          icon="bi-calendar-event"
          title="Agenda"
          description="Cronograma de entregas"
          onClick={close}
        />
      )}
      {permissions.canViewAssemblyList && (
        <DropdownItem
          to="/logistics/assembly-list"
          icon="bi-list-check"
          title="Lista de montagem"
          description="Roteiro de montadores"
          onClick={close}
        />
      )}

      <DropdownSeparator />
      <DropdownGroup title="Mobile" />
      <DropdownItem
        href="https://drive.google.com/file/d/1UfEAzpIbgAYA6hG-fx7w7Ja73uXEVE74/view?usp=sharing"
        icon="bi-android2"
        title="Baixar App Android"
        description="Instalação via APK"
      />
    </NavDropdown>
  );
};

export default LogisticsNavMenu;
