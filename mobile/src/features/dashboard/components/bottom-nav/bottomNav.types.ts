import React from 'react';

export interface NavItemConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  url: string;
  visible?: boolean;
  disabled?: boolean;
}

export interface NativeBottomNavProps {
  isDarkMode: boolean;
  currentTab: string;
  canSeeReports: boolean;
  canSeeProducts?: boolean;
  canSeeFinance?: boolean;
  isAdmin?: boolean;
  handleTabChange: (tab: string, url: string) => void;
  WEB_URL: string;
  customTabs?: NavItemConfig[];
}

export interface BottomNavTabItemProps {
  tab: NavItemConfig;
  active: boolean;
  onPress: () => void;
}

export interface BottomNavMoreSheetProps {
  visible: boolean;
  isDarkMode: boolean;
  bottomInset: number;
  overflowTabs: NavItemConfig[];
  isTabActive: (key: string) => boolean;
  onClose: () => void;
  onSelectTab: (key: string, url: string) => void;
}
