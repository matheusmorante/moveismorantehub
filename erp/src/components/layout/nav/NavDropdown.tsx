import React from 'react';
import type { MenuKey } from '../types';
import { dropdownClass, menuBtnClass, chevronClass } from './navStyles';

export interface NavDropdownProps {
  menuKey: NonNullable<MenuKey>;
  activeMenu: MenuKey;
  setActiveMenu: (menu: MenuKey) => void;
  icon: string;
  label: string;
  disabled?: boolean;
  disabledTooltip?: string;
  betaBadge?: React.ReactNode;
  children: React.ReactNode;
}

export const NavDropdown: React.FC<NavDropdownProps> = ({
  menuKey,
  activeMenu,
  setActiveMenu,
  icon,
  label,
  disabled = false,
  disabledTooltip,
  betaBadge,
  children,
}) => {
  const isOpen = activeMenu === menuKey;

  const toggle = () => {
    if (disabled) return;
    setActiveMenu(isOpen ? null : menuKey);
  };

  return (
    <div
      className="relative h-full flex items-center"
      onMouseEnter={disabled ? undefined : () => setActiveMenu(menuKey)}
      onMouseLeave={disabled ? undefined : () => setActiveMenu(null)}
    >
      <button
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        title={disabled ? disabledTooltip : undefined}
        onClick={toggle}
        className={`${menuBtnClass(isOpen, disabled)} ${
          disabled ? 'cursor-not-allowed disabled:active:scale-100' : ''
        }`}
      >
        <i className={icon} />
        <span>{label}</span>
        {betaBadge}
        {!disabled && <i className={chevronClass(isOpen)} />}
      </button>

      {isOpen && !disabled && (
        <div className={dropdownClass}>
          {children}
        </div>
      )}
    </div>
  );
};

export default NavDropdown;
