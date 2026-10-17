import React from 'react';

interface NavigationRailItemProps {
  icon: string;
  title: string;
  isActive?: boolean;
  badgeCount?: number;
  onClick?: () => void;
  ariaLabel?: string;
}

export const NavigationRailItem: React.FC<NavigationRailItemProps> = ({
  icon,
  title,
  isActive = false,
  badgeCount = 0,
  onClick,
  ariaLabel,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
        isActive
          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
      }`}
    >
      <i className={`bi ${icon} text-base`}></i>
      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
};
