import type { MenuKey } from '../types';
import type { DesktopNavPermissions } from '../hooks/useDesktopNavPermissions';

export interface DropdownItemProps {
  to?: string;
  href?: string;
  icon: string;
  iconColor?: string;
  title: string;
  description?: string;
  beta?: boolean;
  onClick?: () => void;
}

export interface NavMenuProps {
  activeMenu: MenuKey;
  setActiveMenu: (menu: MenuKey) => void;
  permissions?: DesktopNavPermissions;
}
